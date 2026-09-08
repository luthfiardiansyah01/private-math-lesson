// Phase 3 Intelligence — Advanced Tutor Dashboard
// GET /api/analytics/tutor
// Returns TutorAnalyticsDTO: overview + per-student summaries + per-subject overview.

import { db } from "@/lib/db";
import { requireTutor } from "@/lib/auth";
import {
  analyzeStudentPerformance,
  detectWeakTopics,
} from "@/lib/analytics-engine";
import type {
  TutorAnalyticsDTO,
  StudentAnalyticsSummaryDTO,
} from "@/lib/analytics-types";

// "first letter of the first two words of the name, uppercased"
function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export async function GET() {
  const auth = await requireTutor();
  if ("error" in auth)
    return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  // Tutor's own subjects
  const subjects = await db.subject.findMany({
    where: { tutorId: user.id },
    select: {
      id: true,
      title: true,
      color: true,
      topics: { select: { id: true, lessons: { select: { id: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  const subjectIds = subjects.map((s) => s.id);

  // Lessons belonging to tutor's subjects
  const tutorLessons = await db.lesson.findMany({
    where: { topic: { subjectId: { in: subjectIds } } },
    select: { id: true, topic: { select: { subjectId: true } } },
  });
  const tutorLessonIds = tutorLessons.map((l) => l.id);
  const lessonsBySubject = new Map<string, string[]>();
  for (const l of tutorLessons) {
    const arr = lessonsBySubject.get(l.topic.subjectId) ?? [];
    arr.push(l.id);
    lessonsBySubject.set(l.topic.subjectId, arr);
  }
  const totalLessons = tutorLessonIds.length;

  // Exercise ids belonging to tutor's lessons (so we can count attempts + filter by these)
  const tutorExercises = tutorLessonIds.length
    ? await db.exercise.findMany({
        where: { lessonId: { in: tutorLessonIds } },
        select: { id: true },
      })
    : [];
  const tutorExerciseIds = tutorExercises.map((e) => e.id);

  // All progress rows in tutor's lessons (used to derive "students who have any progress")
  const progressRows = tutorLessonIds.length
    ? await db.progress.findMany({
        where: { lessonId: { in: tutorLessonIds } },
        select: {
          studentId: true,
          lessonId: true,
          status: true,
          lastAccessedAt: true,
        },
      })
    : [];

  // Distinct students who have any progress in tutor's subjects
  const studentIdsSet = new Set<string>();
  for (const p of progressRows) studentIdsSet.add(p.studentId);
  const studentIds = Array.from(studentIdsSet);

  // Student records
  const studentUsers = studentIds.length
    ? await db.user.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const studentById = new Map(studentUsers.map((u) => [u.id, u]));

  // StudentStats for all students in one query
  const statsRows = studentIds.length
    ? await db.studentStats.findMany({
        where: { studentId: { in: studentIds } },
      })
    : [];
  const statsByStudent = new Map(statsRows.map((s) => [s.studentId, s]));

  // All mastery rows for these students in tutor's subjects (topic-level + subject-level)
  const masteryRows = studentIds.length
    ? await db.mastery.findMany({
        where: { studentId: { in: studentIds }, subjectId: { in: subjectIds } },
        select: {
          studentId: true,
          subjectId: true,
          topicId: true,
          level: true,
          lessonsCompleted: true,
          lessonsTotal: true,
          avgExerciseScore: true,
        },
      })
    : [];

  // All exercise attempts across tutor's exercises for these students
  const attempts = tutorExerciseIds.length && studentIds.length
    ? await db.exerciseAttempt.findMany({
        where: { exerciseId: { in: tutorExerciseIds }, studentId: { in: studentIds } },
        select: { studentId: true, percentage: true, createdAt: true },
      })
    : [];

  // All game sessions for these students (across all subjects — simpler)
  const gameSessions = studentIds.length
    ? await db.gameSession.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, createdAt: true, score: true },
      })
    : [];

  // ===== Per-student summaries =====
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const students: StudentAnalyticsSummaryDTO[] = [];
  for (const sid of studentIds) {
    const u = studentById.get(sid);
    if (!u) continue;

    const stats = statsByStudent.get(sid);
    const level = stats?.level ?? 1;
    const totalXP = stats?.totalXP ?? 0;
    const currentStreak = stats?.currentStreak ?? 0;

    // avgMastery (avg of topic-level Mastery.level rows for this student in tutor's subjects)
    const studentMasteryRows = masteryRows.filter(
      (m) => m.studentId === sid && m.topicId !== null
    );
    const avgMastery =
      studentMasteryRows.length > 0
        ? Math.round(
            studentMasteryRows.reduce((s, m) => s + m.level, 0) /
              studentMasteryRows.length
          )
        : 0;

    // lessonsCompleted / Total (across tutor's subjects): from subject-level mastery rows (topicId === null)
    // Fallback: count progress rows for this student.
    const subjectLevelMastery = masteryRows.filter(
      (m) => m.studentId === sid && m.topicId === null
    );
    let lessonsCompleted = 0;
    let lessonsTotal = 0;
    if (subjectLevelMastery.length > 0) {
      for (const m of subjectLevelMastery) {
        lessonsCompleted += m.lessonsCompleted;
        lessonsTotal += m.lessonsTotal;
      }
    } else {
      const sProgress = progressRows.filter((p) => p.studentId === sid);
      lessonsCompleted = sProgress.filter((p) => p.status === "COMPLETED").length;
      lessonsTotal = tutorLessonIds.length;
    }

    // exercisesTaken + avgExerciseScore (across tutor's subjects' lessons' exercises)
    const sAttempts = attempts.filter((a) => a.studentId === sid);
    const exercisesTaken = sAttempts.length;
    const avgExerciseScore =
      exercisesTaken > 0
        ? Math.round(sAttempts.reduce((s, a) => s + a.percentage, 0) / exercisesTaken)
        : 0;

    // gamesPlayed
    const sGames = gameSessions.filter((g) => g.studentId === sid);
    const gamesPlayed = sGames.length;

    // weakTopicCount + topWeakTopic (from detectWeakTopics)
    let weakTopicCount = 0;
    let topWeakTopic: string | null = null;
    try {
      const weak = await detectWeakTopics(sid);
      weakTopicCount = weak.filter(
        (w) => w.severity === "CRITICAL" || w.severity === "WEAK"
      ).length;
      // topWeakTopic = lowest mastery topic title (the weak list is already sorted asc)
      topWeakTopic = weak.length > 0 ? weak[0].topicTitle : null;
    } catch {
      // ignore — keep defaults
    }

    // trend — first subject's trend from analyzeStudentPerformance
    let trend: StudentAnalyticsSummaryDTO["trend"] = "STABLE";
    try {
      const perf = await analyzeStudentPerformance(sid);
      if (perf.length > 0) trend = perf[0].trend;
    } catch {
      // keep STABLE
    }

    // lastActive
    const sProgress = progressRows.filter((p) => p.studentId === sid);
    let lastActiveDate: Date | null = null;
    for (const p of sProgress) {
      if (p.lastAccessedAt) {
        if (!lastActiveDate || p.lastAccessedAt > lastActiveDate) {
          lastActiveDate = p.lastAccessedAt;
        }
      }
    }
    const lastActive = lastActiveDate ? lastActiveDate.toISOString() : null;

    students.push({
      studentId: sid,
      name: u.name,
      email: u.email,
      avatarInitials: avatarInitials(u.name),
      level,
      totalXP,
      currentStreak,
      avgMastery,
      lessonsCompleted,
      lessonsTotal,
      exercisesTaken,
      avgExerciseScore,
      gamesPlayed,
      weakTopicCount,
      topWeakTopic,
      trend,
      lastActive,
    });
  }

  // Sort students: most recently active first
  students.sort((a, b) => {
    const ta = a.lastActive ? new Date(a.lastActive).getTime() : 0;
    const tb = b.lastActive ? new Date(b.lastActive).getTime() : 0;
    return tb - ta;
  });

  // ===== Subject overview =====
  const subjectOverview: TutorAnalyticsDTO["subjectOverview"] = [];
  for (const s of subjects) {
    const lessonsInThisSubject = lessonsBySubject.get(s.id) ?? [];
    const subjectProgress = progressRows.filter((p) =>
      lessonsInThisSubject.includes(p.lessonId)
    );
    const subjectStudentIds = new Set(subjectProgress.map((p) => p.studentId));

    // avg Mastery.level for this subject (any row — topic + subject level)
    const subjectMasteryRows = masteryRows.filter(
      (m) => m.subjectId === s.id
    );
    const avgMastery =
      subjectMasteryRows.length > 0
        ? Math.round(
            subjectMasteryRows.reduce((sm, m) => sm + m.level, 0) /
              subjectMasteryRows.length
          )
        : 0;

    // weakTopicCount: count of Mastery rows for this subject with level < 50
    const weakTopicCount = subjectMasteryRows.filter(
      (m) => m.level < 50
    ).length;

    subjectOverview.push({
      subjectId: s.id,
      subjectTitle: s.title,
      color: s.color,
      studentCount: subjectStudentIds.size,
      avgMastery,
      weakTopicCount,
    });
  }

  // ===== Overview =====
  const totalStudents = studentIds.length;
  const totalSubjects = subjects.length;

  // avgMasteryAcrossStudents: average all Mastery.level rows (topic-level) for students who have progress in tutor's subjects
  const topicLevelMastery = masteryRows.filter((m) => m.topicId !== null);
  const avgMasteryAcrossStudents =
    topicLevelMastery.length > 0
      ? Math.round(
          topicLevelMastery.reduce((s, m) => s + m.level, 0) /
            topicLevelMastery.length
        )
      : 0;

  // activeStudentsThisWeek: students with progress.lastAccessedAt in last 7 days
  const activeStudentsThisWeek = new Set(
    progressRows
      .filter(
        (p) => p.lastAccessedAt && p.lastAccessedAt >= sevenDaysAgo
      )
      .map((p) => p.studentId)
  ).size;

  // totalExerciseAttempts (across tutor's subjects' lessons' exercises)
  const totalExerciseAttempts = attempts.length;

  // totalGameSessions (all game sessions by students with progress in tutor's subjects)
  const totalGameSessions = gameSessions.length;

  const result: TutorAnalyticsDTO = {
    user: { id: user.id, name: user.name, email: user.email },
    overview: {
      totalStudents,
      totalSubjects,
      totalLessons,
      avgMasteryAcrossStudents,
      activeStudentsThisWeek,
      totalExerciseAttempts,
      totalGameSessions,
    },
    students,
    subjectOverview,
  };

  return Response.json(result);
}
