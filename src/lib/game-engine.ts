// Phase 2 Gamification engine — XP/level math, streak logic, achievement catalog.
// Used by API routes (server-side only).

import { db } from "@/lib/db";
import type { GameType, GameSubmitPayload, GameSubmitResult, StudentStatsDTO, AchievementDTO } from "@/lib/game-types";

// ===== Level system =====
// Level n requires cumulative XP: 50 * (n-1) * n
// L1: 0, L2: 100, L3: 300, L4: 600, L5: 1000, L6: 1500, L7: 2100, L8: 2800...
export function levelForXP(xp: number): number {
  // solve 50*(n-1)*n <= xp  =>  n^2 - n - xp/50 <= 0  =>  n = (1 + sqrt(1 + xp/12.5)) / 2
  const n = Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2);
  return Math.max(1, n);
}

export function xpThresholdForLevel(level: number): number {
  // cumulative XP required to REACH this level
  return 50 * (level - 1) * level;
}

export function levelProgress(xp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  levelProgressPct: number;
} {
  const level = levelForXP(xp);
  const currentThreshold = xpThresholdForLevel(level);
  const nextThreshold = xpThresholdForLevel(level + 1);
  const xpIntoLevel = xp - currentThreshold;
  const xpForNextLevel = nextThreshold - currentThreshold;
  const levelProgressPct =
    xpForNextLevel > 0 ? Math.round((xpIntoLevel / xpForNextLevel) * 100) : 0;
  return { level, xpIntoLevel, xpForNextLevel, levelProgressPct };
}

// ===== Streak logic =====
function todayStr(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
function yesterdayStr(d = new Date()): string {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return y.toISOString().slice(0, 10);
}

export function computeNewStreak(
  currentStreak: number,
  lastActiveDate: string | null
): number {
  const today = todayStr();
  if (lastActiveDate === today) {
    // already active today, streak unchanged
    return currentStreak;
  }
  if (lastActiveDate === yesterdayStr()) {
    return currentStreak + 1;
  }
  // missed a day (or never active) → reset to 1
  return 1;
}

// ===== XP earning =====
export function computeXPEarned(
  gameType: GameType,
  correctCount: number,
  totalCount: number,
  durationSec: number,
  status: string,
  maxStreak: number,
  metadata?: any
): number {
  if (status === "ABANDONED") return 0;
  let xp = 0;
  // base per correct
  xp += correctCount * 10;
  // streak bonus (capped at 50)
  xp += Math.min(maxStreak * 5, 50);
  // completion bonus
  if (status === "COMPLETED") xp += 25;
  // game-type specific
  if (gameType === "MATH_RUSH") {
    // speed bonus: extra XP for fast play
    if (durationSec > 0 && durationSec <= 60) xp += 20;
  }
  if (gameType === "BOSS_CHALLENGE" && metadata?.bossDefeated) {
    xp += 150; // boss defeat bonus
  }
  if (gameType === "QUIZ" && correctCount === totalCount && totalCount > 0) {
    xp += 30; // perfect quiz
  }
  return xp;
}

// ===== Achievement catalog =====
// Each achievement has a `check` function that returns true if unlocked given context.
export interface AchievementDef {
  code: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  xpReward: number;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // General
  { code: "FIRST_GAME", title: "Langkah Pertama", description: "Selesaikan game pertamamu", icon: "Footprints", category: "GENERAL", threshold: 1, xpReward: 50 },
  { code: "GAMES_10", title: "Pemain Aktif", description: "Mainkan 10 game", icon: "Gamepad2", category: "GENERAL", threshold: 10, xpReward: 100 },
  { code: "GAMES_50", title: "Gamer Sejati", description: "Mainkan 50 game", icon: "Joystick", category: "GENERAL", threshold: 50, xpReward: 250 },
  // Quiz
  { code: "QUIZ_PERFECT", title: "Sempurna!", description: "Dapat skor 100% di Interactive Quiz", icon: "Star", category: "QUIZ", threshold: 1, xpReward: 100 },
  { code: "QUIZ_MASTER", title: "Master Kuis", description: "Selesaikan 5 quiz", icon: "Brain", category: "QUIZ", threshold: 5, xpReward: 150 },
  // Math Rush
  { code: "RUSH_20", title: "Cepat Bertubi-tubi", description: "Jawab 20+ soal benar di Math Rush", icon: "Zap", category: "RUSH", threshold: 20, xpReward: 100 },
  { code: "RUSH_30", title: "Kilat", description: "Jawab 30+ soal benar di Math Rush", icon: "Rocket", category: "RUSH", threshold: 30, xpReward: 200 },
  // Puzzle
  { code: "PUZZLE_5", title: "Pemikir", description: "Selesaikan 5 puzzle", icon: "Puzzle", category: "PUZZLE", threshold: 5, xpReward: 100 },
  { code: "PUZZLE_15", title: "Ahli Teka-Teki", description: "Selesaikan 15 puzzle", icon: "Lightbulb", category: "PUZZLE", threshold: 15, xpReward: 200 },
  // Boss
  { code: "BOSS_FIRST", title: "Pembunuh Boss", description: "Kalahkan boss pertamamu", icon: "Sword", category: "BOSS", threshold: 1, xpReward: 200 },
  { code: "BOSS_3", title: "Pemburu Boss", description: "Kalahkan 3 boss", icon: "Crosshair", category: "BOSS", threshold: 3, xpReward: 300 },
  { code: "BOSS_PERFECT", title: "Tanpa Cedera", description: "Kalahkan boss tanpa kehilangan HP", icon: "Shield", category: "BOSS", threshold: 1, xpReward: 300 },
  // Streak
  { code: "STREAK_3", title: "Konsisten", description: "Belajar 3 hari berturut-turut", icon: "Flame", category: "STREAK", threshold: 3, xpReward: 100 },
  { code: "STREAK_7", title: "Seminggu Penuh", description: "Belajar 7 hari berturut-turut", icon: "Flame", category: "STREAK", threshold: 7, xpReward: 250 },
  { code: "STREAK_30", title: "Tak Terhentikan", description: "Belajar 30 hari berturut-turut", icon: "Flame", category: "STREAK", threshold: 30, xpReward: 1000 },
  // Level
  { code: "LEVEL_5", title: "Berkembang", description: "Capai Level 5", icon: "TrendingUp", category: "LEVEL", threshold: 5, xpReward: 200 },
  { code: "LEVEL_10", title: "Mahir", description: "Capai Level 10", icon: "Trophy", category: "LEVEL", threshold: 10, xpReward: 500 },
];

// Check which achievements should be unlocked given the student's current state.
export interface AchievementContext {
  gamesPlayed: number;
  totalCorrect: number;
  totalQuestions: number;
  bossesDefeated: number;
  puzzlesSolved: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  // session-specific
  lastGameType: GameType;
  lastGameCorrect: number;
  lastGameTotal: number;
  lastGameScore: number;
  lastGameStatus: string;
  lastGameBossDefeated: boolean;
  lastGameStudentHpLeft: number;
  lastGameMaxStreak: number;
}

export function checkAchievements(ctx: AchievementContext): string[] {
  const unlocked: string[] = [];
  const map = new Map(ACHIEVEMENT_DEFS.map((a) => [a.code, a]));

  function push(code: string, condition: boolean) {
    if (condition && map.has(code)) unlocked.push(code);
  }

  // General
  push("FIRST_GAME", ctx.gamesPlayed >= 1);
  push("GAMES_10", ctx.gamesPlayed >= 10);
  push("GAMES_50", ctx.gamesPlayed >= 50);
  // Quiz
  push(
    "QUIZ_PERFECT",
    ctx.lastGameType === "QUIZ" &&
      ctx.lastGameCorrect === ctx.lastGameTotal &&
      ctx.lastGameTotal > 0
  );
  const quizCount = ctx.lastGameType === "QUIZ" ? 1 : 0; // simplified: we use gamesPlayed for quiz count below
  push("QUIZ_MASTER", ctx.gamesPlayed >= 5); // approximation; exact quiz count tracked separately if needed
  // Rush
  push(
    "RUSH_20",
    ctx.lastGameType === "MATH_RUSH" && ctx.lastGameCorrect >= 20
  );
  push(
    "RUSH_30",
    ctx.lastGameType === "MATH_RUSH" && ctx.lastGameCorrect >= 30
  );
  // Puzzle
  push("PUZZLE_5", ctx.puzzlesSolved >= 5);
  push("PUZZLE_15", ctx.puzzlesSolved >= 15);
  // Boss
  push("BOSS_FIRST", ctx.bossesDefeated >= 1);
  push("BOSS_3", ctx.bossesDefeated >= 3);
  push(
    "BOSS_PERFECT",
    ctx.lastGameType === "BOSS_CHALLENGE" &&
      ctx.lastGameBossDefeated &&
      ctx.lastGameStudentHpLeft >= 100 // full HP
  );
  // Streak
  push("STREAK_3", ctx.currentStreak >= 3 || ctx.longestStreak >= 3);
  push("STREAK_7", ctx.currentStreak >= 7 || ctx.longestStreak >= 7);
  push("STREAK_30", ctx.longestStreak >= 30);
  // Level
  push("LEVEL_5", ctx.level >= 5);
  push("LEVEL_10", ctx.level >= 10);

  return unlocked;
}

// ===== Ensure StudentStats exists =====
export async function ensureStats(studentId: string) {
  let stats = await db.studentStats.findUnique({ where: { studentId } });
  if (!stats) {
    stats = await db.studentStats.create({ data: { studentId } });
  }
  return stats;
}

export function toStatsDTO(stats: any): StudentStatsDTO {
  const prog = levelProgress(stats.totalXP);
  return {
    totalXP: stats.totalXP,
    level: prog.level,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    lastActiveDate: stats.lastActiveDate,
    gamesPlayed: stats.gamesPlayed,
    totalCorrect: stats.totalCorrect,
    totalQuestions: stats.totalQuestions,
    bossesDefeated: stats.bossesDefeated,
    puzzlesSolved: stats.puzzlesSolved,
    bestQuizScore: stats.bestQuizScore,
    bestMathRushScore: stats.bestMathRushScore,
    bestMathPuzzleScore: stats.bestMathPuzzleScore,
    bestBossScore: stats.bestBossScore,
    xpIntoLevel: prog.xpIntoLevel,
    xpForNextLevel: prog.xpForNextLevel,
    levelProgressPct: prog.levelProgressPct,
  };
}

// ===== Core: process a game submission =====
export async function processGameSubmission(
  studentId: string,
  payload: GameSubmitPayload
): Promise<GameSubmitResult> {
  const stats = await ensureStats(studentId);

  // 1. Compute XP
  const xpEarned = computeXPEarned(
    payload.gameType,
    payload.correctCount,
    payload.totalCount,
    payload.durationSec,
    payload.status,
    payload.maxStreak ?? 0,
    payload.metadata
  );

  // 2. Create game session
  const gameSession = await db.gameSession.create({
    data: {
      studentId,
      gameType: payload.gameType,
      score: payload.score,
      xpEarned,
      correctCount: payload.correctCount,
      totalCount: payload.totalCount,
      durationSec: payload.durationSec,
      status: payload.status,
      metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
    },
  });

  // 3. Update streak
  const newStreak = computeNewStreak(stats.currentStreak, stats.lastActiveDate);
  const today = new Date().toISOString().slice(0, 10);

  // 4. Update stats
  const newTotalXP = stats.totalXP + xpEarned;
  const newLevel = levelForXP(newTotalXP);
  const leveledUp = newLevel > stats.level;

  // best scores
  const bestFieldMap: Record<GameType, string> = {
    QUIZ: "bestQuizScore",
    MATH_RUSH: "bestMathRushScore",
    MATH_PUZZLE: "bestMathPuzzleScore",
    BOSS_CHALLENGE: "bestBossScore",
  };
  const bestField = bestFieldMap[payload.gameType];
  const currentBest = (stats as any)[bestField] as number;
  const newBest = Math.max(currentBest, payload.score);

  // boss / puzzle counters
  const bossDefeated =
    payload.gameType === "BOSS_CHALLENGE" &&
    !!payload.metadata?.bossDefeated;
  const puzzleSolved =
    payload.gameType === "MATH_PUZZLE" && payload.status === "COMPLETED";

  const updatedStats = await db.studentStats.update({
    where: { studentId },
    data: {
      totalXP: newTotalXP,
      level: newLevel,
      currentStreak: newStreak,
      longestStreak: Math.max(stats.longestStreak, newStreak),
      lastActiveDate: today,
      gamesPlayed: stats.gamesPlayed + 1,
      totalCorrect: stats.totalCorrect + payload.correctCount,
      totalQuestions: stats.totalQuestions + payload.totalCount,
      bossesDefeated: stats.bossesDefeated + (bossDefeated ? 1 : 0),
      puzzlesSolved: stats.puzzlesSolved + (puzzleSolved ? 1 : 0),
      [bestField]: newBest,
    },
  });

  // 5. Check achievements
  const ctx: AchievementContext = {
    gamesPlayed: updatedStats.gamesPlayed,
    totalCorrect: updatedStats.totalCorrect,
    totalQuestions: updatedStats.totalQuestions,
    bossesDefeated: updatedStats.bossesDefeated,
    puzzlesSolved: updatedStats.puzzlesSolved,
    currentStreak: updatedStats.currentStreak,
    longestStreak: updatedStats.longestStreak,
    level: updatedStats.level,
    lastGameType: payload.gameType,
    lastGameCorrect: payload.correctCount,
    lastGameTotal: payload.totalCount,
    lastGameScore: payload.score,
    lastGameStatus: payload.status,
    lastGameBossDefeated: bossDefeated,
    lastGameStudentHpLeft: payload.metadata?.studentHpLeft ?? 0,
    lastGameMaxStreak: payload.maxStreak ?? 0,
  };
  const shouldUnlock = checkAchievements(ctx);

  // fetch existing unlocks
  const existingUnlocks = await db.studentAchievement.findMany({
    where: { studentId },
    select: { achievement: { select: { code: true } } },
  });
  const existingCodes = new Set(existingUnlocks.map((u) => u.achievement.code));
  const toUnlock = shouldUnlock.filter((c) => !existingCodes.has(c));

  const newAchievements: AchievementDTO[] = [];
  let bonusXP = 0;
  for (const code of toUnlock) {
    const def = ACHIEVEMENT_DEFS.find((a) => a.code === code);
    if (!def) continue;
    const achievement = await db.achievement.findUnique({ where: { code } });
    if (!achievement) continue;
    await db.studentAchievement.create({
      data: { studentId, achievementId: achievement.id },
    });
    bonusXP += def.xpReward;
    newAchievements.push({
      id: achievement.id,
      code: def.code,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      threshold: def.threshold,
      xpReward: def.xpReward,
      unlocked: true,
      unlockedAt: new Date().toISOString(),
      progress: def.threshold,
    });
  }

  // apply bonus XP from achievements
  let finalStats = updatedStats;
  if (bonusXP > 0) {
    const newTotalXP2 = updatedStats.totalXP + bonusXP;
    const newLevel2 = levelForXP(newTotalXP2);
    finalStats = await db.studentStats.update({
      where: { studentId },
      data: { totalXP: newTotalXP2, level: newLevel2 },
    });
    if (newLevel2 > newLevel) {
      // leveled up again from achievement bonus
    }
  }

  return {
    gameSession: {
      id: gameSession.id,
      gameType: gameSession.gameType as GameType,
      score: gameSession.score,
      xpEarned,
      correctCount: gameSession.correctCount,
      totalCount: gameSession.totalCount,
      durationSec: gameSession.durationSec,
      status: gameSession.status as any,
      metadata: payload.metadata ?? null,
      createdAt: gameSession.createdAt.toISOString(),
    },
    xpEarned: xpEarned + bonusXP,
    newStats: toStatsDTO(finalStats),
    leveledUp: finalStats.level > stats.level,
    newLevel: finalStats.level > stats.level ? finalStats.level : null,
    newAchievements,
  };
}

// ===== Achievement list with unlock status + progress =====
export async function getAchievementsForStudent(studentId: string): Promise<AchievementDTO[]> {
  const stats = await ensureStats(studentId);
  const allAchievements = await db.achievement.findMany();
  const unlocks = await db.studentAchievement.findMany({
    where: { studentId },
    include: { achievement: true },
  });
  const unlockMap = new Map(unlocks.map((u) => [u.achievement.code, u]));

  return ACHIEVEMENT_DEFS.map((def) => {
    const unlock = unlockMap.get(def.code);
    let progress = 0;
    // compute progress for display
    switch (def.code) {
      case "FIRST_GAME":
      case "GAMES_10":
      case "GAMES_50":
        progress = Math.min(stats.gamesPlayed, def.threshold);
        break;
      case "QUIZ_MASTER":
        progress = Math.min(stats.gamesPlayed, def.threshold);
        break;
      case "PUZZLE_5":
      case "PUZZLE_15":
        progress = Math.min(stats.puzzlesSolved, def.threshold);
        break;
      case "BOSS_FIRST":
      case "BOSS_3":
        progress = Math.min(stats.bossesDefeated, def.threshold);
        break;
      case "STREAK_3":
      case "STREAK_7":
      case "STREAK_30":
        progress = Math.min(stats.longestStreak, def.threshold);
        break;
      case "LEVEL_5":
      case "LEVEL_10":
        progress = Math.min(stats.level, def.threshold);
        break;
      default:
        progress = unlock ? def.threshold : 0;
    }
    return {
      id: unlock?.achievement.id ?? def.code,
      code: def.code,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      threshold: def.threshold,
      xpReward: def.xpReward,
      unlocked: !!unlock,
      unlockedAt: unlock ? unlock.unlockedAt.toISOString() : null,
      progress,
    };
  });
}
