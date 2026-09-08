import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { ensureStats, toStatsDTO } from "@/lib/game-engine";
import type {
  GamifiedDashboardDTO,
  AchievementDTO,
  GameSessionDTO,
  GameType,
  GameStatus,
  GameMetadata,
} from "@/lib/game-types";

function parseMetadata(s: string | null): GameMetadata | null {
  if (!s) return null;
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" ? (v as GameMetadata) : null;
  } catch {
    return null;
  }
}

// GET /api/dashboard/student-gamified — lightweight gamification summary for the
// student dashboard. Returned alongside (not replacing) the existing
// /api/dashboard/student payload.
export async function GET() {
  const auth = await requireStudent();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const stats = await ensureStats(user.id);

  const [recentUnlocks, recentSessions] = await Promise.all([
    db.studentAchievement.findMany({
      where: { studentId: user.id },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
      take: 4,
    }),
    db.gameSession.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const recentBadges: AchievementDTO[] = recentUnlocks.map((u) => ({
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

  const recentGames: GameSessionDTO[] = recentSessions.map((s) => ({
    id: s.id,
    gameType: s.gameType as GameType,
    score: s.score,
    xpEarned: s.xpEarned,
    correctCount: s.correctCount,
    totalCount: s.totalCount,
    durationSec: s.durationSec,
    status: s.status as GameStatus,
    metadata: parseMetadata(s.metadata),
    createdAt: s.createdAt.toISOString(),
  }));

  const payload: GamifiedDashboardDTO = {
    stats: toStatsDTO(stats),
    recentBadges,
    recentGames,
  };

  return Response.json(payload);
}
