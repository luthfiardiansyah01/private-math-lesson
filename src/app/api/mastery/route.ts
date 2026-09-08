import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";

export async function GET() {
  const auth = await requireStudent();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const rows = await db.mastery.findMany({
    where: { studentId: user.id },
    include: {
      subject: { select: { id: true, title: true, color: true } },
      topic: { select: { id: true, title: true } },
    },
  });

  const topicLevel = rows
    .filter((m) => m.topicId !== null)
    .map((m) => ({
      subjectId: m.subjectId,
      subjectTitle: m.subject?.title ?? "",
      color: m.subject?.color ?? "",
      topicId: m.topicId as string,
      topicTitle: m.topic?.title ?? "",
      level: m.level,
      lessonsCompleted: m.lessonsCompleted,
      lessonsTotal: m.lessonsTotal,
      avgExerciseScore: m.avgExerciseScore,
    }));

  // Subject-level: stored row (topicId null) if present, otherwise aggregate from topic-level.
  const subjectsSeen = new Map<
    string,
    { subjectId: string; subjectTitle: string; color: string }
  >();
  for (const m of rows) {
    if (!subjectsSeen.has(m.subjectId)) {
      subjectsSeen.set(m.subjectId, {
        subjectId: m.subjectId,
        subjectTitle: m.subject?.title ?? "",
        color: m.subject?.color ?? "",
      });
    }
  }

  const subjectLevel: {
    subjectId: string;
    subjectTitle: string;
    color: string;
    topicId: null;
    topicTitle: string;
    level: number;
    lessonsCompleted: number;
    lessonsTotal: number;
    avgExerciseScore: number;
  }[] = [];

  for (const [subjectId, meta] of subjectsSeen) {
    const stored = rows.find((m) => m.subjectId === subjectId && m.topicId === null);
    if (stored) {
      subjectLevel.push({
        ...meta,
        topicId: null,
        topicTitle: "",
        level: stored.level,
        lessonsCompleted: stored.lessonsCompleted,
        lessonsTotal: stored.lessonsTotal,
        avgExerciseScore: stored.avgExerciseScore,
      });
    } else {
      // Aggregate from topic-level rows for this subject.
      const topicRows = rows.filter((m) => m.subjectId === subjectId && m.topicId !== null);
      const level =
        topicRows.length > 0
          ? Math.round(topicRows.reduce((s, m) => s + m.level, 0) / topicRows.length)
          : 0;
      const lessonsCompleted = topicRows.reduce((s, m) => s + m.lessonsCompleted, 0);
      const lessonsTotal = topicRows.reduce((s, m) => s + m.lessonsTotal, 0);
      const avgExerciseScore =
        topicRows.length > 0
          ? Math.round(topicRows.reduce((s, m) => s + m.avgExerciseScore, 0) / topicRows.length)
          : 0;
      subjectLevel.push({
        ...meta,
        topicId: null,
        topicTitle: "",
        level,
        lessonsCompleted,
        lessonsTotal,
        avgExerciseScore,
      });
    }
  }

  return Response.json({ topics: topicLevel, subjects: subjectLevel });
}
