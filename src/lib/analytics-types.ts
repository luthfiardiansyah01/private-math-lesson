// Phase 3 Intelligence & Reporting — shared API contracts

import type { GameSessionDTO } from "@/lib/game-types";

// ---- Mastery Breakdown ----
export interface MasteryBreakdownDTO {
  lessonCompletionPct: number;
  exerciseScoreAvg: number;
  gameScoreAvg: number;
  weightedMastery: number;
  lessonsCompleted: number;
  lessonsTotal: number;
}

// ---- Weak Topic ----
export interface WeakTopicDTO {
  topicId: string;
  topicTitle: string;
  subjectId: string;
  subjectTitle: string;
  subjectColor: string;
  masteryLevel: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  avgExerciseScore: number;
  severity: "CRITICAL" | "WEAK" | "MODERATE";
  gap: number;
}

// ---- Subject Performance ----
export interface SubjectPerformanceDTO {
  subjectId: string;
  subjectTitle: string;
  subjectColor: string;
  masteryLevel: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  avgExerciseScore: number;
  exerciseAttempts: number;
  gameSessionsCount: number;
  avgGameScore: number;
  timeSpentSec: number;
  trend: "IMPROVING" | "DECLINING" | "STABLE" | "NEW";
  trendDelta: number;
  recentScores: { date: string; score: number }[];
}

// ---- Trend ----
export interface TrendPointDTO {
  date: string;
  masteryLevel: number;
}

// ---- Recommendation ----
export interface RecommendationDTO {
  id: string;
  type: string; // LEARNING | WEAK_TOPIC | STUDY_PLAN
  content: string; // markdown
  priority: string; // LOW | MEDIUM | HIGH
  relatedSubjectId: string | null;
  relatedTopicId: string | null;
  createdAt: string;
}

// ---- Advanced Tutor Dashboard ----
export interface TutorAnalyticsDTO {
  user: { id: string; name: string; email: string };
  overview: {
    totalStudents: number;
    totalSubjects: number;
    totalLessons: number;
    avgMasteryAcrossStudents: number;
    activeStudentsThisWeek: number;
    totalExerciseAttempts: number;
    totalGameSessions: number;
  };
  students: StudentAnalyticsSummaryDTO[];
  subjectOverview: {
    subjectId: string;
    subjectTitle: string;
    color: string;
    studentCount: number;
    avgMastery: number;
    weakTopicCount: number;
  }[];
}

export interface StudentAnalyticsSummaryDTO {
  studentId: string;
  name: string;
  email: string;
  avatarInitials: string;
  level: number;
  totalXP: number;
  currentStreak: number;
  avgMastery: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  exercisesTaken: number;
  avgExerciseScore: number;
  gamesPlayed: number;
  weakTopicCount: number;
  topWeakTopic: string | null;
  trend: "IMPROVING" | "DECLINING" | "STABLE" | "NEW";
  lastActive: string | null;
}

// ---- Student Detail Analytics ----
export interface StudentDetailAnalyticsDTO {
  student: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
  profile: {
    educationLevel: string | null;
    targetExam: string | null;
    studyGoals: string | null;
    bio: string | null;
  } | null;
  stats: {
    level: number;
    totalXP: number;
    currentStreak: number;
    longestStreak: number;
    gamesPlayed: number;
    bossesDefeated: number;
    totalCorrect: number;
    totalQuestions: number;
  };
  masteryBreakdown: MasteryBreakdownDTO;
  subjectPerformance: SubjectPerformanceDTO[];
  weakTopics: WeakTopicDTO[];
  trends: { subjectId: string; subjectTitle: string; color: string; points: TrendPointDTO[] }[];
  recentActivity: {
    type: string;
    title: string;
    detail: string;
    timestamp: string;
  }[];
  recommendations: RecommendationDTO[];
  recentGames: GameSessionDTO[];
  achievementsUnlocked: number;
}

// ---- Report ----
export interface ReportDTO {
  student: { id: string; name: string; email: string };
  profile: {
    educationLevel: string | null;
    targetExam: string | null;
    studyGoals: string | null;
  } | null;
  period: { type: "WEEKLY" | "MONTHLY"; start: string; end: string };
  stats: {
    lessonsCompleted: number;
    lessonsTotal: number;
    exercisesTaken: number;
    avgExerciseScore: number;
    gamesPlayed: number;
    totalTimeSpentSec: number;
    currentStreak: number;
    level: number;
    totalXP: number;
    bossesDefeated: number;
  };
  subjectPerformance: SubjectPerformanceDTO[];
  weakTopics: WeakTopicDTO[];
  recentActivity: {
    type: string;
    title: string;
    detail: string;
    timestamp: string;
  }[];
  recommendations: RecommendationDTO[];
  achievementsUnlocked: number;
  summary: string;
}

// ---- Parent Dashboard ----
export interface ParentDashboardDTO {
  parent: { id: string; name: string; email: string };
  children: {
    studentId: string;
    name: string;
    avatarInitials: string;
    relation: string;
    level: number;
    totalXP: number;
    currentStreak: number;
    avgMastery: number;
    lessonsCompleted: number;
    lessonsTotal: number;
    weakTopicCount: number;
    topWeakTopic: string | null;
    trend: "IMPROVING" | "DECLINING" | "STABLE" | "NEW";
    lastActive: string | null;
  }[];
}
