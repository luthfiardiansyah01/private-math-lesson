import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { ensureStats, toStatsDTO } from "@/lib/game-engine";
import type { GameHubDTO, GameType, AchievementDTO } from "@/lib/game-types";

interface GameMetaRow {
  type: GameType;
  title: string;
  description: string;
  icon: string;
  color: string;
  bestField: "bestQuizScore" | "bestMathRushScore" | "bestMathPuzzleScore" | "bestBossScore";
}

const GAME_META: GameMetaRow[] = [
  {
    type: "QUIZ",
    title: "Interactive Quiz",
    description: "Latihan soal dari materi pelajaran",
    icon: "Brain",
    color: "emerald",
    bestField: "bestQuizScore",
  },
  {
    type: "MATH_RUSH",
    title: "Math Rush",
    description: "Jawab soal aritmatika secepat mungkin",
    icon: "Zap",
    color: "amber",
    bestField: "bestMathRushScore",
  },
  {
    type: "MATH_PUZZLE",
    title: "Math Puzzle",
    description: "Teka-teki logika dan pola angka",
    icon: "Puzzle",
    color: "violet",
    bestField: "bestMathPuzzleScore",
  },
  {
    type: "BOSS_CHALLENGE",
    title: "Boss Challenge",
    description: "Kalahkan boss dengan jawaban benar",
    icon: "Sword",
    color: "rose",
    bestField: "bestBossScore",
  },
];

// GET /api/game-hub — aggregate dashboard payload for the Game Hub page.
export async function GET() {
  const auth = await requireStudent();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  // Parallel fetches: stats + all game-session metadata for student + all bosses +
  // recent achievement unlocks + leaderboard.
  const stats = await ensureStats(user.id);
  const statsDTO = toStatsDTO(stats);

  const [playCounts, bossSessions, bosses, recentUnlocks, topStudents] = await Promise.all([
    db.gameSession.groupBy({
      by: ["gameType"],
      where: { studentId: user.id },
      _count: { _all: true },
    }),
    db.gameSession.findMany({
      where: { studentId: user.id, gameType: "BOSS_CHALLENGE" },
      select: { metadata: true },
    }),
    db.boss.findMany(),
    db.studentAchievement.findMany({
      where: { studentId: user.id },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
      take: 4,
    }),
    db.studentStats.findMany({
      orderBy: { totalXP: "desc" },
      take: 5,
      include: { student: { select: { id: true, name: true } } },
    }),
  ]);

  // Build play count lookup
  const playCountMap = new Map<string, number>();
  for (const row of playCounts) {
    playCountMap.set(row.gameType, row._count._all);
  }

  const games = GAME_META.map((g) => ({
    type: g.type,
    title: g.title,
    description: g.description,
    icon: g.icon,
    color: g.color,
    bestScore: (stats as any)[g.bestField] as number,
    playsCount: playCountMap.get(g.type) ?? 0,
  }));

  // Build "defeated boss" set: a boss counts as defeated if any BOSS_CHALLENGE
  // session metadata JSON string contains the bossId (per spec — string `includes`
  // is the pragmatic check since SQLite JSON matching is awkward).
  const bossesDTO = bosses.map((b) => {
    const defeated = bossSessions.some(
      (s) => !!s.metadata && s.metadata.includes(b.id)
    );
    return {
      id: b.id,
      name: b.name,
      icon: b.icon,
      color: b.color,
      difficulty: b.difficulty,
      hp: b.hp,
      rewardXP: b.rewardXP,
      defeated,
    };
  });

  const recentAchievements: AchievementDTO[] = recentUnlocks.map((u) => ({
    id: u.achievement.id,
    code: u.achievement.code,
    title: u.achievement.title,
    description: u.achievement.description,
    icon: u.achievement.icon,
    category: u.achievement.category,
    threshold: u.achievement.threshold,
    xpReward: u.achievement.xpReward,
    unlocked: true,
    unlockedAt: u.unlockedAt.toISOString(),
    progress: u.achievement.threshold,
  }));

  const leaderboard = topStudents.map((s) => ({
    studentId: s.studentId,
    name: s.student?.name ?? "Siswa",
    totalXP: s.totalXP,
    level: s.level,
  }));

  const hub: GameHubDTO = {
    stats: statsDTO,
    games,
    bosses: bossesDTO,
    recentAchievements,
    leaderboard,
  };

  return Response.json(hub);
}
