// Phase 3 Intelligence — analytics engine.
// Computes weighted mastery, detects weak topics, analyzes performance, snapshots trends.
// Server-side only.

import { db } from "@/lib/db";

// ===== Weighted Mastery Calculation =====
// mastery = 0.40 * lessonCompletion + 0.40 * exercisePerformance + 0.20 * gamePerformance
export const MASTERY_WEIGHTS = {
  lessonCompletion: 0.4,
  exercisePerformance: 0.4,
  gamePerformance: 0.2,
};

export interface MasteryBreakdown {
  lessonCompletionPct: number; // 0-100
  exerciseScoreAvg: number; // 0-100
  gameScoreAvg: number; // 0-100 (normalized)
  weightedMastery: number; // 0-100
  lessonsCompleted: number;
  lessonsTotal: number;
}

export function computeWeightedMastery(
  lessonsCompleted: number,
  lessonsTotal: number,
  exerciseScoreAvg: number,
  gameScoreAvg: number
): MasteryBreakdown {
  const lessonCompletionPct =
    lessonsTotal > 0 ? Math.round((lessonsCompleted / lessonsTotal) * 100) : 0;
  const weighted = Math.round(
    MASTERY_WEIGHTS.lessonCompletion * lessonCompletionPct +
      MASTERY_WEIGHTS.exercisePerformance * (exerciseScoreAvg || 0) +
      MASTERY_WEIGHTS.gamePerformance * (gameScoreAvg || 0)
  );
  return {
    lessonCompletionPct,
    exerciseScoreAvg,
    gameScoreAvg,
    weightedMastery: Math.min(100, Math.max(0, weighted)),
    lessonsCompleted,
    lessonsTotal,
  };
}

// ===== Snapshot today's mastery for trend tracking =====
export async function snapshotMasteryHistory(studentId: string, subjectId: string) {
  const today = new Date().toISOString().slice(0, 10);
  // Check if already snapshotted today
  const existing = await db.masteryHistory.findUnique({
    where: { studentId_subjectId_date: { studentId, subjectId, date: today } },
  });
  if (existing) return existing;

  // Compute current mastery for this subject
  const mastery = await db.mastery.findFirst({
    where: { studentId, subjectId, topicId: null },
  });
  const lessonsCompleted = mastery?.lessonsCompleted ?? 0;
  const lessonsTotal = mastery?.lessonsTotal ?? 0;
  const avgExerciseScore = mastery?.avgExerciseScore ?? 0;

  // game score avg for this subject — from GameSessions with metadata.subjectId.
  // GameSession has no `percentage` field; compute normalized pct from correctCount/totalCount.
  const gameSessions = await db.gameSession.findMany({
    where: { studentId, metadata: { contains: subjectId } },
    select: { correctCount: true, totalCount: true },
  });
  const gameScoreAvg =
    gameSessions.length > 0
      ? Math.round(
          (gameSessions.reduce((s, g) => {
            const pct = g.totalCount > 0 ? (g.correctCount / g.totalCount) * 100 : 0;
            return s + pct;
          }, 0) /
            gameSessions.length)
        )
      : 0;

  const breakdown = computeWeightedMastery(
    lessonsCompleted,
    lessonsTotal,
    avgExerciseScore,
    gameScoreAvg
  );

  return db.masteryHistory.create({
    data: {
      studentId,
      subjectId,
      date: today,
      masteryLevel: breakdown.weightedMastery,
      lessonsCompleted,
      avgExerciseScore,
      gameScoreAvg,
    },
  });
}

// ===== Weak Topic Detection =====
// A topic is "weak" if its weighted mastery < WEAK_THRESHOLD.
export const WEAK_THRESHOLD = 50;
export const MODERATE_THRESHOLD = 70;

export interface WeakTopic {
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
  gap: number; // how far below 100
}

export async function detectWeakTopics(studentId: string): Promise<WeakTopic[]> {
  // Get all topic-level mastery rows for the student
  const masteryRows = await db.mastery.findMany({
    where: { studentId, topicId: { not: null } },
    include: {
      topic: { select: { id: true, title: true, subject: { select: { id: true, title: true, color: true } } } },
      subject: { select: { id: true, title: true, color: true } },
    },
  });

  const topics: WeakTopic[] = masteryRows
    .filter((m) => m.topic)
    .map((m) => {
      const level = m.level;
      const severity =
        level < WEAK_THRESHOLD / 2
          ? "CRITICAL"
          : level < WEAK_THRESHOLD
          ? "WEAK"
          : level < MODERATE_THRESHOLD
          ? "MODERATE"
          : "MODERATE";
      return {
        topicId: m.topicId!,
        topicTitle: m.topic!.title,
        subjectId: m.subjectId,
        subjectTitle: m.subject!.title,
        subjectColor: m.subject!.color,
        masteryLevel: level,
        lessonsCompleted: m.lessonsCompleted,
        lessonsTotal: m.lessonsTotal,
        avgExerciseScore: m.avgExerciseScore,
        severity: severity as any,
        gap: 100 - level,
      };
    })
    .filter((t) => t.masteryLevel < MODERATE_THRESHOLD) // only show weak + moderate
    .sort((a, b) => a.masteryLevel - b.masteryLevel);

  return topics;
}

// ===== Performance Analysis =====
export interface SubjectPerformance {
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
  trendDelta: number; // change since last week
  recentScores: { date: string; score: number }[]; // last 7 days exercise/game percentages
}

export async function analyzeStudentPerformance(
  studentId: string
): Promise<SubjectPerformance[]> {
  // Get all subjects the student has interacted with
  const subjects = await db.subject.findMany({
    include: {
      topics: {
        include: {
          lessons: {
            include: {
              progress: { where: { studentId } },
              exercises: {
                include: {
                  attempts: { where: { studentId }, orderBy: { createdAt: "desc" }, take: 10 },
                },
              },
            },
          },
        },
      },
      mastery: { where: { studentId } },
    },
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const results: SubjectPerformance[] = [];

  for (const subject of subjects) {
    // Check if the student has any interaction with this subject
    const hasProgress = subject.topics.some((t) =>
      t.lessons.some((l) => l.progress.length > 0)
    );
    const hasAttempts = subject.topics.some((t) =>
      t.lessons.some((l) => l.exercises.some((e) => e.attempts.length > 0))
    );
    if (!hasProgress && !hasAttempts) continue;

    // lessons
    const allLessons = subject.topics.flatMap((t) => t.lessons);
    const lessonsTotal = allLessons.length;
    const lessonsCompleted = allLessons.filter(
      (l) => l.progress[0]?.status === "COMPLETED"
    ).length;
    const timeSpentSec = allLessons.reduce(
      (s, l) => s + (l.progress[0]?.timeSpentSec ?? 0),
      0
    );

    // exercises
    const allAttempts = subject.topics.flatMap((t) =>
      t.lessons.flatMap((l) => l.exercises.flatMap((e) => e.attempts))
    );
    const exerciseAttempts = allAttempts.length;
    const avgExerciseScore =
      exerciseAttempts > 0
        ? Math.round(
            allAttempts.reduce((s, a) => s + a.percentage, 0) / exerciseAttempts
          )
        : 0;

    // mastery
    const subjectMastery = subject.mastery.find((m) => m.topicId === null);
    const masteryLevel = subjectMastery?.level ?? 0;

    // game sessions for this subject
    const gameSessions = await db.gameSession.findMany({
      where: { studentId, metadata: { contains: subject.id } },
      orderBy: { createdAt: "desc" },
    });
    const gameSessionsCount = gameSessions.length;
    const avgGameScore =
      gameSessionsCount > 0
        ? Math.round(
            gameSessions.reduce((s, g) => s + (g.score ?? 0), 0) /
              gameSessionsCount
          )
        : 0;

    // trend: compare this week's avg score vs last week's
    const thisWeekAttempts = allAttempts.filter(
      (a) => a.createdAt >= sevenDaysAgo
    );
    const lastWeekAttempts = allAttempts.filter(
      (a) => a.createdAt >= fourteenDaysAgo && a.createdAt < sevenDaysAgo
    );
    const thisWeekAvg =
      thisWeekAttempts.length > 0
        ? thisWeekAttempts.reduce((s, a) => s + a.percentage, 0) /
          thisWeekAttempts.length
        : 0;
    const lastWeekAvg =
      lastWeekAttempts.length > 0
        ? lastWeekAttempts.reduce((s, a) => s + a.percentage, 0) /
          lastWeekAttempts.length
        : 0;

    let trend: SubjectPerformance["trend"] = "STABLE";
    let trendDelta = 0;
    if (lastWeekAttempts.length === 0 && thisWeekAttempts.length === 0) {
      trend = "STABLE";
    } else if (lastWeekAttempts.length === 0 && thisWeekAttempts.length > 0) {
      trend = "NEW";
      trendDelta = Math.round(thisWeekAvg);
    } else {
      trendDelta = Math.round(thisWeekAvg - lastWeekAvg);
      if (trendDelta > 5) trend = "IMPROVING";
      else if (trendDelta < -5) trend = "DECLINING";
      else trend = "STABLE";
    }

    // recent scores (last 7 days, for sparkline)
    const recentScores = allAttempts
      .filter((a) => a.createdAt >= sevenDaysAgo)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((a) => ({
        date: a.createdAt.toISOString().slice(0, 10),
        score: a.percentage,
      }));

    results.push({
      subjectId: subject.id,
      subjectTitle: subject.title,
      subjectColor: subject.color,
      masteryLevel,
      lessonsCompleted,
      lessonsTotal,
      avgExerciseScore,
      exerciseAttempts,
      gameSessionsCount,
      avgGameScore,
      timeSpentSec,
      trend,
      trendDelta,
      recentScores,
    });
  }

  return results;
}

// ===== Progress Trend (from MasteryHistory) =====
export interface TrendPoint {
  date: string;
  masteryLevel: number;
}

export async function getMasteryTrend(
  studentId: string,
  subjectId: string,
  days = 30
): Promise<TrendPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const history = await db.masteryHistory.findMany({
    where: { studentId, subjectId, date: { gte: sinceStr } },
    orderBy: { date: "asc" },
  });

  return history.map((h) => ({
    date: h.date,
    masteryLevel: h.masteryLevel,
  }));
}

// ===== Report data (weekly/monthly) =====
export interface ReportData {
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
  subjectPerformance: SubjectPerformance[];
  weakTopics: WeakTopic[];
  recentActivity: {
    type: string;
    title: string;
    detail: string;
    timestamp: string;
  }[];
  recommendations: {
    id: string;
    content: string;
    priority: string;
    type: string;
    createdAt: string;
  }[];
  achievementsUnlocked: number;
  summary: string; // generated summary text
}

export async function buildReportData(
  studentId: string,
  period: "WEEKLY" | "MONTHLY"
): Promise<ReportData> {
  const student = await db.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!student) throw new Error("Student not found");

  const profile = await db.profile.findUnique({
    where: { userId: studentId },
    select: {
      educationLevel: true,
      targetExam: true,
      studyGoals: true,
    },
  });

  const end = new Date();
  const start = new Date();
  if (period === "WEEKLY") start.setDate(start.getDate() - 7);
  else start.setDate(start.getDate() - 30);

  // progress in period
  const progressRows = await db.progress.findMany({
    where: {
      studentId,
      lastAccessedAt: { gte: start },
    },
    include: { lesson: { select: { title: true } } },
  });
  const lessonsCompleted = progressRows.filter(
    (p) => p.status === "COMPLETED"
  ).length;

  // total lessons (across all subjects)
  const lessonsTotal = await db.lesson.count();

  // exercise attempts in period
  const attempts = await db.exerciseAttempt.findMany({
    where: { studentId, createdAt: { gte: start } },
    include: { exercise: { select: { title: true } } },
  });
  const exercisesTaken = attempts.length;
  const avgExerciseScore =
    exercisesTaken > 0
      ? Math.round(
          attempts.reduce((s, a) => s + a.percentage, 0) / exercisesTaken
        )
      : 0;

  // game sessions in period
  const gameSessions = await db.gameSession.findMany({
    where: { studentId, createdAt: { gte: start } },
  });
  const gamesPlayed = gameSessions.length;
  const totalTimeSpentSec =
    progressRows.reduce((s, p) => s + p.timeSpentSec, 0) +
    gameSessions.reduce((s, g) => s + g.durationSec, 0);

  // stats
  const stats = await db.studentStats.findUnique({ where: { studentId } });
  const achievementsUnlocked = await db.studentAchievement.count({
    where: {
      studentId,
      unlockedAt: { gte: start },
    },
  });

  // subject performance
  const subjectPerformance = await analyzeStudentPerformance(studentId);

  // weak topics
  const weakTopics = await detectWeakTopics(studentId);

  // recent activity (merge attempts + game sessions)
  type Activity = ReportData["recentActivity"][number];
  const activities: (Activity & { _t: number })[] = [];
  for (const a of attempts.slice(0, 20)) {
    activities.push({
      type: "exercise",
      title: a.exercise?.title ?? "Latihan",
      detail: `Skor ${a.percentage}%${a.passed ? " (Lulus)" : ""}`,
      timestamp: a.createdAt.toISOString(),
      _t: a.createdAt.getTime(),
    });
  }
  for (const g of gameSessions.slice(0, 20)) {
    activities.push({
      type: "game",
      title: g.gameType,
      detail: `${g.score} poin · ${g.correctCount}/${g.totalCount} benar`,
      timestamp: g.createdAt.toISOString(),
      _t: g.createdAt.getTime(),
    });
  }
  activities.sort((a, b) => b._t - a._t);
  const recentActivity = activities.slice(0, 15).map(({ _t, ...rest }) => rest);

  // recommendations
  const recommendations = await db.recommendation.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // summary
  const masteryAvg =
    subjectPerformance.length > 0
      ? Math.round(
          subjectPerformance.reduce((s, p) => s + p.masteryLevel, 0) /
            subjectPerformance.length
        )
      : 0;
  const topWeak = weakTopics[0];
  const summary =
    `Pada periode ${period === "WEEKLY" ? "minggu" : "bulan"} ini, ` +
    `${student.name} menyelesaikan ${lessonsCompleted} pelajaran, ` +
    `mengerjakan ${exercisesTaken} latihan (rata-rata ${avgExerciseScore}%), ` +
    `dan bermain ${gamesPlayed} game. ` +
    `Rata-rata penguasaan materi: ${masteryAvg}%. ` +
    (topWeak
      ? `Topik yang perlu diperkuat: ${topWeak.topicTitle} (${topWeak.masteryLevel}%). `
      : "") +
    `Streak belajar: ${stats?.currentStreak ?? 0} hari. Level saat ini: ${
      stats?.level ?? 1
    } (${stats?.totalXP ?? 0} XP).`;

  return {
    student: { id: student.id, name: student.name, email: student.email },
    profile,
    period: {
      type: period,
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    },
    stats: {
      lessonsCompleted,
      lessonsTotal,
      exercisesTaken,
      avgExerciseScore,
      gamesPlayed,
      totalTimeSpentSec,
      currentStreak: stats?.currentStreak ?? 0,
      level: stats?.level ?? 1,
      totalXP: stats?.totalXP ?? 0,
      bossesDefeated: stats?.bossesDefeated ?? 0,
    },
    subjectPerformance,
    weakTopics,
    recentActivity,
    recommendations: recommendations.map((r) => ({
      id: r.id,
      content: r.content,
      priority: r.priority,
      type: r.type,
      createdAt: r.createdAt.toISOString(),
    })),
    achievementsUnlocked,
    summary,
  };
}
