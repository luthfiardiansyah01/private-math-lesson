import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import type { StudentDashboardDTO } from "@/lib/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET() {
  const auth = await requireStudent();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  // --- Progress (with lesson/topic/subject) ---
  const progressRows = await db.progress.findMany({
    where: { studentId: user.id },
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          topic: {
            select: {
              id: true,
              title: true,
              subject: { select: { id: true, title: true, color: true } },
            },
          },
        },
      },
    },
  });

  // Subjects the student has any progress in.
  const enrolledSubjectIds = new Set<string>();
  for (const p of progressRows) {
    const sid = p.lesson?.topic?.subject?.id;
    if (sid) enrolledSubjectIds.add(sid);
  }

  // Lessons total: across enrolled subjects (or all subjects if 0 enrolled).
  let lessonsTotal = 0;
  if (enrolledSubjectIds.size > 0) {
    const cnt = await db.lesson.count({
      where: { topic: { subjectId: { in: Array.from(enrolledSubjectIds) } } },
    });
    lessonsTotal = cnt;
  } else {
    lessonsTotal = await db.lesson.count();
  }

  const lessonsCompleted = progressRows.filter((p) => p.status === "COMPLETED").length;

  // --- Sessions ---
  const sessions = await db.learningSession.findMany({
    where: { studentId: user.id },
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          topic: {
            select: {
              id: true,
              title: true,
              subject: { select: { id: true, title: true, color: true } },
            },
          },
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  const activeSessions = sessions.filter((s) => s.status === "IN_PROGRESS").length;
  const totalSessionSec = sessions.reduce((s, x) => s + x.durationSec, 0);
  const totalProgressSec = progressRows.reduce((s, x) => s + x.timeSpentSec, 0);

  // --- Mastery (topic-level for averaging) ---
  const masteryRows = await db.mastery.findMany({
    where: { studentId: user.id, topicId: { not: null } },
    include: { subject: { select: { id: true, title: true, color: true } } },
  });
  const avgMastery =
    masteryRows.length > 0
      ? Math.round(masteryRows.reduce((s, m) => s + m.level, 0) / masteryRows.length)
      : 0;

  // --- Exercise attempts ---
  const attempts = await db.exerciseAttempt.findMany({
    where: { studentId: user.id },
    include: {
      exercise: {
        select: {
          id: true,
          title: true,
          lesson: {
            select: {
              id: true,
              title: true,
              topic: {
                select: {
                  id: true,
                  title: true,
                  subject: { select: { id: true, title: true, color: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const exercisesTaken = attempts.length;
  const avgExerciseScore =
    attempts.length > 0
      ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length)
      : 0;

  // --- continueLearning: top 5 IN_PROGRESS (or recently completed) by lastAccessedAt desc ---
  const continueLearning = progressRows
    .filter((p) => p.lesson && p.lesson.topic && p.lesson.topic.subject)
    .slice()
    .sort((a, b) => {
      const ta = a.lastAccessedAt ? a.lastAccessedAt.getTime() : 0;
      const tb = b.lastAccessedAt ? b.lastAccessedAt.getTime() : 0;
      return tb - ta;
    })
    .slice(0, 5)
    .map((p) => ({
      lessonId: p.lessonId,
      lessonTitle: p.lesson!.title,
      topicTitle: p.lesson!.topic.title,
      subjectTitle: p.lesson!.topic.subject.title,
      subjectColor: p.lesson!.topic.subject.color,
      completionPct: p.completionPct,
      status: p.status as any,
    }));

  // --- recentActivity: merge sessions (endedAt/startedAt) + attempts (createdAt), 8 most recent ---
  type Activity = StudentDashboardDTO["recentActivity"][number];
  const activities: (Activity & { _t: number })[] = [];

  for (const s of sessions) {
    const t = s.endedAt ? s.endedAt.getTime() : s.startedAt.getTime();
    activities.push({
      id: s.id,
      type: "lesson",
      title: s.lesson?.title ?? "Lesson",
      detail: s.endedAt
        ? `Studied ${Math.max(1, Math.round(s.durationSec / 60))} min`
        : "Session started",
      timestamp: new Date(t).toISOString(),
      _t: t,
    });
  }
  for (const a of attempts) {
    const t = a.createdAt.getTime();
    activities.push({
      id: a.id,
      type: "exercise",
      title: a.exercise?.title ?? "Exercise",
      detail: `Scored ${a.percentage}%${a.passed ? " (passed)" : ""}`,
      timestamp: new Date(t).toISOString(),
      _t: t,
    });
  }
  activities.sort((a, b) => b._t - a._t);
  const recentActivity = activities.slice(0, 8).map(({ _t, ...rest }) => rest);

  // --- masteryBySubject: average topic-level mastery per subject ---
  const bySubject = new Map<
    string,
    { subjectId: string; subjectTitle: string; color: string; levels: number[] }
  >();
  for (const m of masteryRows) {
    const sid = m.subjectId;
    const meta = m.subject;
    if (!bySubject.has(sid)) {
      bySubject.set(sid, {
        subjectId: sid,
        subjectTitle: meta?.title ?? "",
        color: meta?.color ?? "",
        levels: [],
      });
    }
    bySubject.get(sid)!.levels.push(m.level);
  }
  const masteryBySubject = Array.from(bySubject.values()).map((v) => ({
    subjectId: v.subjectId,
    subjectTitle: v.subjectTitle,
    color: v.color,
    level:
      v.levels.length > 0
        ? Math.round(v.levels.reduce((s, x) => s + x, 0) / v.levels.length)
        : 0,
  }));

  // --- weeklyActivity: last 7 days, sum session.durationSec (by startedAt day) ---
  // Using session duration (per-day event signal) as the granular study-time signal.
  const today = startOfDay(new Date());
  const days: { date: Date; label: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({ date: d, label: DAY_LABELS[d.getDay()], minutes: 0 });
  }
  const dayStart = days[0].date.getTime();
  const dayEnd = startOfDay(new Date(today.getTime() + 24 * 60 * 60 * 1000)).getTime();

  for (const s of sessions) {
    const t = s.startedAt.getTime();
    if (t < dayStart || t >= dayEnd) continue;
    const idx = Math.floor((t - dayStart) / (24 * 60 * 60 * 1000));
    if (idx >= 0 && idx < days.length) {
      days[idx].minutes += Math.round(s.durationSec / 60);
    }
  }
  const weeklyActivity = days.map((d) => ({ day: d.label, minutes: d.minutes }));

  const dashboard: StudentDashboardDTO = {
    user: { id: user.id, name: user.name, email: user.email },
    stats: {
      subjectsEnrolled: enrolledSubjectIds.size,
      lessonsCompleted,
      lessonsTotal,
      activeSessions,
      totalTimeSpentSec: totalProgressSec + totalSessionSec,
      avgMastery,
      exercisesTaken,
      avgExerciseScore,
    },
    continueLearning,
    recentActivity,
    masteryBySubject,
    weeklyActivity,
  };

  return Response.json(dashboard);
}
