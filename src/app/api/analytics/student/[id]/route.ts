// Phase 3 Intelligence — Student Detail Analytics
// GET /api/analytics/student/[id]
// Auth: TUTOR (any), STUDENT (own only), PARENT (linked child only).
// Returns StudentDetailAnalyticsDTO.

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  analyzeStudentPerformance,
  detectWeakTopics,
  computeWeightedMastery,
  snapshotMasteryHistory,
  getMasteryTrend,
} from "@/lib/analytics-engine";
import type { StudentDetailAnalyticsDTO } from "@/lib/analytics-types";
import type {
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

// Verify the current user can view this student's analytics.
async function canViewStudent(
  viewer: { id: string; role: "STUDENT" | "TUTOR" | "PARENT" },
  studentId: string
): Promise<boolean> {
  if (viewer.role === "TUTOR") return true;
  if (viewer.role === "STUDENT") return viewer.id === studentId;
  // PARENT — must have a ParentLink row
  const link = await db.parentLink.findUnique({
    where: { parentId_studentId: { parentId: viewer.id, studentId } },
  });
  return !!link;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth)
    return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { id: studentId } = await params;

  const allowed = await canViewStudent(user, studentId);
  if (!allowed)
    return Response.json(
      { error: "Forbidden: cannot view this student" },
      { status: 403 }
    );

  // Fetch student record
  const student = await db.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!student)
    return Response.json({ error: "Student not found" }, { status: 404 });
  if (student.role !== "STUDENT")
    return Response.json(
      { error: "Target user is not a student" },
      { status: 400 }
    );

  // Profile + Stats
  const profile = await db.profile.findUnique({
    where: { userId: studentId },
    select: {
      educationLevel: true,
      targetExam: true,
      studyGoals: true,
      bio: true,
    },
  });
  const stats = await db.studentStats.findUnique({
    where: { studentId },
  });

  // Mastery breakdown — overall weighted mastery across subjects
  // Use subject-level mastery rows (topicId === null) to aggregate.
  const subjectLevelMastery = await db.mastery.findMany({
    where: { studentId, topicId: null },
    select: {
      lessonsCompleted: true,
      lessonsTotal: true,
      avgExerciseScore: true,
      subjectId: true,
    },
  });
  const lessonsCompletedAgg = subjectLevelMastery.reduce(
    (s, m) => s + m.lessonsCompleted,
    0
  );
  const lessonsTotalAgg = subjectLevelMastery.reduce(
    (s, m) => s + m.lessonsTotal,
    0
  );
  const avgExerciseScoreAgg =
    subjectLevelMastery.length > 0
      ? Math.round(
          subjectLevelMastery.reduce((s, m) => s + m.avgExerciseScore, 0) /
            subjectLevelMastery.length
        )
      : 0;

  // gameScoreAvg — average normalized score across all the student's game sessions.
  // GameSession has no `percentage` field, so compute it from correctCount/totalCount.
  const allGameSessions = await db.gameSession.findMany({
    where: { studentId },
    select: { score: true, totalCount: true, correctCount: true },
  });
  const gameScoreAvg =
    allGameSessions.length > 0
      ? Math.round(
          (allGameSessions.reduce((s, g) => {
            const pct = g.totalCount > 0 ? (g.correctCount / g.totalCount) * 100 : 0;
            return s + pct;
          }, 0) /
            allGameSessions.length)
        )
      : 0;

  const breakdown = computeWeightedMastery(
    lessonsCompletedAgg,
    lessonsTotalAgg,
    avgExerciseScoreAgg,
    gameScoreAvg
  );

  // Subject performance
  const subjectPerformance = await analyzeStudentPerformance(studentId);

  // Weak topics
  const weakTopics = await detectWeakTopics(studentId);

  // Trends — for each subject the student has, snapshot today + get 30-day trend
  const allSubjects = await db.subject.findMany({
    select: { id: true, title: true, color: true },
    orderBy: { createdAt: "asc" },
  });
  const trends: StudentDetailAnalyticsDTO["trends"] = [];
  for (const s of allSubjects) {
    try {
      await snapshotMasteryHistory(studentId, s.id);
      const points = await getMasteryTrend(studentId, s.id, 30);
      // Only include subjects that actually have any trend data OR any mastery interaction
      const hasMastery = await db.mastery.findFirst({
        where: { studentId, subjectId: s.id },
        select: { id: true },
      });
      if (points.length > 0 || hasMastery) {
        trends.push({
          subjectId: s.id,
          subjectTitle: s.title,
          color: s.color,
          points,
        });
      }
    } catch {
      // skip subject on error
    }
  }

  // Recent activity: merge last 10 ExerciseAttempt + last 10 GameSession, sort desc, take 15
  const recentAttempts = await db.exerciseAttempt.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { exercise: { select: { title: true } } },
  });
  const recentGamesRaw = await db.gameSession.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  type Activity = {
    type: string;
    title: string;
    detail: string;
    timestamp: string;
    _t: number;
  };
  const activities: Activity[] = [];
  for (const a of recentAttempts) {
    activities.push({
      type: "exercise",
      title: a.exercise?.title ?? "Latihan",
      detail: `Skor ${a.percentage}%${a.passed ? " · Lulus" : ""}`,
      timestamp: a.createdAt.toISOString(),
      _t: a.createdAt.getTime(),
    });
  }
  for (const g of recentGamesRaw) {
    activities.push({
      type: "game",
      title: g.gameType,
      detail: `${g.score} poin · ${g.correctCount}/${g.totalCount} benar`,
      timestamp: g.createdAt.toISOString(),
      _t: g.createdAt.getTime(),
    });
  }
  activities.sort((a, b) => b._t - a._t);
  const recentActivity = activities
    .slice(0, 15)
    .map(({ _t, ...rest }) => rest);

  // Recommendations (last 5)
  const recRows = await db.recommendation.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const recommendations = recRows.map((r) => ({
    id: r.id,
    type: r.type,
    content: r.content,
    priority: r.priority,
    relatedSubjectId: r.relatedSubjectId,
    relatedTopicId: r.relatedTopicId,
    createdAt: r.createdAt.toISOString(),
  }));

  // Recent games (last 5, parsed metadata)
  const recentGamesDtos: GameSessionDTO[] = recentGamesRaw.slice(0, 5).map((g) => ({
    id: g.id,
    gameType: g.gameType as GameType,
    score: g.score,
    xpEarned: g.xpEarned,
    correctCount: g.correctCount,
    totalCount: g.totalCount,
    durationSec: g.durationSec,
    status: g.status as GameStatus,
    metadata: parseMetadata(g.metadata),
    createdAt: g.createdAt.toISOString(),
  }));

  // Achievements unlocked count
  const achievementsUnlocked = await db.studentAchievement.count({
    where: { studentId },
  });

  const result: StudentDetailAnalyticsDTO = {
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      createdAt: student.createdAt.toISOString(),
    },
    profile: profile
      ? {
          educationLevel: profile.educationLevel,
          targetExam: profile.targetExam,
          studyGoals: profile.studyGoals,
          bio: profile.bio,
        }
      : null,
    stats: {
      level: stats?.level ?? 1,
      totalXP: stats?.totalXP ?? 0,
      currentStreak: stats?.currentStreak ?? 0,
      longestStreak: stats?.longestStreak ?? 0,
      gamesPlayed: stats?.gamesPlayed ?? 0,
      bossesDefeated: stats?.bossesDefeated ?? 0,
      totalCorrect: stats?.totalCorrect ?? 0,
      totalQuestions: stats?.totalQuestions ?? 0,
    },
    masteryBreakdown: {
      lessonCompletionPct: breakdown.lessonCompletionPct,
      exerciseScoreAvg: breakdown.exerciseScoreAvg,
      gameScoreAvg: breakdown.gameScoreAvg,
      weightedMastery: breakdown.weightedMastery,
      lessonsCompleted: breakdown.lessonsCompleted,
      lessonsTotal: breakdown.lessonsTotal,
    },
    subjectPerformance: subjectPerformance.map((p) => ({
      subjectId: p.subjectId,
      subjectTitle: p.subjectTitle,
      subjectColor: p.subjectColor,
      masteryLevel: p.masteryLevel,
      lessonsCompleted: p.lessonsCompleted,
      lessonsTotal: p.lessonsTotal,
      avgExerciseScore: p.avgExerciseScore,
      exerciseAttempts: p.exerciseAttempts,
      gameSessionsCount: p.gameSessionsCount,
      avgGameScore: p.avgGameScore,
      timeSpentSec: p.timeSpentSec,
      trend: p.trend,
      trendDelta: p.trendDelta,
      recentScores: p.recentScores,
    })),
    weakTopics: weakTopics.map((w) => ({
      topicId: w.topicId,
      topicTitle: w.topicTitle,
      subjectId: w.subjectId,
      subjectTitle: w.subjectTitle,
      subjectColor: w.subjectColor,
      masteryLevel: w.masteryLevel,
      lessonsCompleted: w.lessonsCompleted,
      lessonsTotal: w.lessonsTotal,
      avgExerciseScore: w.avgExerciseScore,
      severity: w.severity,
      gap: w.gap,
    })),
    trends,
    recentActivity,
    recommendations,
    recentGames: recentGamesDtos,
    achievementsUnlocked,
  };

  return Response.json(result);
}
