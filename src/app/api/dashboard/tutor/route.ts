import { db } from "@/lib/db";
import { requireTutor } from "@/lib/auth";
import type { TutorDashboardDTO } from "@/lib/types";

export async function GET() {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  // Tutor's own subjects with topic/lesson counts.
  const subjects = await db.subject.findMany({
    where: { tutorId: user.id },
    include: {
      topics: { select: { id: true, lessons: { select: { id: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const subjectIds = subjects.map((s) => s.id);

  // Lesson ids that belong to tutor's subjects.
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

  // Progress rows for lessons belonging to tutor.
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

  // Distinct students who have progress in tutor's subjects.
  const studentIds = new Set<string>();
  for (const p of progressRows) studentIds.add(p.studentId);

  // Total sessions on tutor's lessons.
  const totalSessions = tutorLessonIds.length
    ? await db.learningSession.count({
        where: { lessonId: { in: tutorLessonIds } },
      })
    : 0;

  // Topic + lesson + exercise counts.
  const topicsCount = subjects.reduce((s, sub) => s + sub.topics.length, 0);
  const lessonsCount = subjects.reduce(
    (s, sub) => s + sub.topics.reduce((ts, t) => ts + t.lessons.length, 0),
    0
  );
  const exercisesCount = tutorLessonIds.length
    ? await db.exercise.count({ where: { lessonId: { in: tutorLessonIds } } })
    : 0;

  // Per-subject breakdown.
  const subjectsOut: TutorDashboardDTO["subjects"] = [];
  for (const s of subjects) {
    const lessonsInThisSubject = lessonsBySubject.get(s.id) ?? [];
    const subjectProgress = progressRows.filter((p) =>
      lessonsInThisSubject.includes(p.lessonId)
    );
    const subjectStudentIds = new Set(subjectProgress.map((p) => p.studentId));

    const masteryAgg = await db.mastery.aggregate({
      where: { subjectId: s.id },
      _avg: { level: true },
    });
    const avgMastery = masteryAgg._avg.level
      ? Math.round(masteryAgg._avg.level)
      : 0;

    subjectsOut.push({
      id: s.id,
      title: s.title,
      color: s.color,
      topicsCount: s.topics.length,
      lessonsCount: lessonsInThisSubject.length,
      studentsCount: subjectStudentIds.size,
      avgMastery,
    });
  }

  // Recent students: pull User info + per-student aggregates.
  const recentStudentsRaw = studentIds.size
    ? await db.user.findMany({
        where: { id: { in: Array.from(studentIds) } },
        select: { id: true, name: true, email: true },
      })
    : [];

  const recentStudents: TutorDashboardDTO["recentStudents"] = [];
  for (const u of recentStudentsRaw) {
    const studentProgress = progressRows.filter((p) => p.studentId === u.id);
    const lessonsCompleted = studentProgress.filter((p) => p.status === "COMPLETED").length;
    const lastActive = studentProgress.reduce<Date | null>((max, p) => {
      if (!p.lastAccessedAt) return max;
      if (!max || p.lastAccessedAt > max) return p.lastAccessedAt;
      return max;
    }, null);

    const masteryAgg = await db.mastery.aggregate({
      where: { studentId: u.id, subjectId: { in: subjectIds } },
      _avg: { level: true },
    });
    const avgMastery = masteryAgg._avg.level ? Math.round(masteryAgg._avg.level) : 0;

    recentStudents.push({
      id: u.id,
      name: u.name,
      email: u.email,
      lessonsCompleted,
      avgMastery,
      lastActive: lastActive ? lastActive.toISOString() : null,
    });
  }

  recentStudents.sort((a, b) => {
    const ta = a.lastActive ? new Date(a.lastActive).getTime() : 0;
    const tb = b.lastActive ? new Date(b.lastActive).getTime() : 0;
    return tb - ta;
  });

  const dashboard: TutorDashboardDTO = {
    user: { id: user.id, name: user.name, email: user.email },
    stats: {
      subjectsCount: subjects.length,
      topicsCount,
      lessonsCount,
      exercisesCount,
      studentsCount: studentIds.size,
      totalSessions,
    },
    subjects: subjectsOut,
    recentStudents: recentStudents.slice(0, 8),
  };

  return Response.json(dashboard);
}
