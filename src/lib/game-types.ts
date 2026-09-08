// Phase 2 Gamification — shared API contracts

export type GameType = "QUIZ" | "MATH_RUSH" | "MATH_PUZZLE" | "BOSS_CHALLENGE";

export type GameStatus = "COMPLETED" | "FAILED" | "ABANDONED";

// ---- XP / Level ----
export interface StudentStatsDTO {
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  gamesPlayed: number;
  totalCorrect: number;
  totalQuestions: number;
  bossesDefeated: number;
  puzzlesSolved: number;
  bestQuizScore: number;
  bestMathRushScore: number;
  bestMathPuzzleScore: number;
  bestBossScore: number;
  xpIntoLevel: number; // XP earned within current level
  xpForNextLevel: number; // XP needed to reach next level
  levelProgressPct: number; // 0-100
}

// ---- Achievements ----
export interface AchievementDTO {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  xpReward: number;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number; // current progress toward threshold (for display)
}

// ---- Game Session ----
export interface GameSessionDTO {
  id: string;
  gameType: GameType;
  score: number;
  xpEarned: number;
  correctCount: number;
  totalCount: number;
  durationSec: number;
  status: GameStatus;
  metadata: GameMetadata | null;
  createdAt: string;
}

export interface GameMetadata {
  subjectId?: string;
  subjectTitle?: string;
  subjectColor?: string;
  bossId?: string;
  bossName?: string;
  difficulty?: string;
  maxStreak?: number;
  studentHpLeft?: number;
  bossDefeated?: boolean;
}

// ---- Game Submit ----
export interface GameSubmitPayload {
  gameType: GameType;
  score: number;
  correctCount: number;
  totalCount: number;
  durationSec: number;
  status: GameStatus;
  maxStreak?: number;
  metadata?: GameMetadata;
}

export interface GameSubmitResult {
  gameSession: GameSessionDTO;
  xpEarned: number;
  newStats: StudentStatsDTO;
  leveledUp: boolean;
  newLevel: number | null;
  newAchievements: AchievementDTO[];
}

// ---- Math Rush ----
export interface MathRushQuestion {
  id: number;
  text: string; // "7 × 8 = ?"
  answer: number;
  options: number[]; // 4 options including answer
}

// ---- Math Puzzle ----
export interface PuzzleDTO {
  id: string;
  type: string;
  question: string;
  options: string[] | null;
  answer: string;
  explanation: string | null;
  difficulty: string;
  xpReward: number;
}

// ---- Boss Challenge ----
export interface BossQuestion {
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string | null;
}

export interface BossDTO {
  id: string;
  name: string;
  description: string;
  subjectId: string | null;
  hp: number;
  attack: number;
  icon: string;
  color: string;
  difficulty: string;
  rewardXP: number;
  questions: BossQuestion[];
}

// ---- Game Hub ----
export interface GameHubDTO {
  stats: StudentStatsDTO;
  games: {
    type: GameType;
    title: string;
    description: string;
    icon: string;
    color: string;
    bestScore: number;
    playsCount: number;
  }[];
  bosses: {
    id: string;
    name: string;
    icon: string;
    color: string;
    difficulty: string;
    hp: number;
    rewardXP: number;
    defeated: boolean;
  }[];
  recentAchievements: AchievementDTO[];
  leaderboard: {
    studentId: string;
    name: string;
    totalXP: number;
    level: number;
  }[];
}

// ---- Gamified Dashboard additions ----
export interface GamifiedDashboardDTO {
  stats: StudentStatsDTO;
  recentBadges: AchievementDTO[];
  recentGames: GameSessionDTO[];
  // plus everything from Phase 1 StudentDashboardDTO is fetched separately
}
