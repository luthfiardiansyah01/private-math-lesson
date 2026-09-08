import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import type { SessionDTO } from "@/lib/types";

function toSessionDTO(s: any): SessionDTO {
  return {
    id: s.id,
    studentId: s.studentId,
    lessonId: s.lessonId,
    lessonTitle: s.lesson?.title ?? "",
    topicTitle: s.lesson?.topic?.title ?? "",
    subjectTitle: s.lesson?.topic?.subject?.title ?? "",
    subjectColor: s.lesson?.topic?.subject?.color ?? "",
    startedAt: s.startedAt.toISOString(),
    endedAt: s.endedAt ? s.endedAt.toISOString() : null,
    durationSec: s.durationSec,
    status: s.status,
  };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStudent();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { id } = await params;

  const session = await db.learningSession.findUnique({
    where: { id },
    include: {
      lesson: {
        include: {
          topic: { include: { subject: { select: { title: true, color: true, tutorId: true } } } },
        },
      },
    },
  });
  if (!session || session.studentId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { status, completionPct, durationSec } = body ?? {};

    const data: Record<string, any> = {};
    if (typeof status === "string" && ["IN_PROGRESS", "COMPLETED", "ABANDONED"].includes(status)) {
      data.status = status;
    }
    if (typeof durationSec === "number") data.durationSec = durationSec;
    if (status === "COMPLETED") {
      data.endedAt = new Date();
    }

    await db.learningSession.update({ where: { id }, data });

    // If completionPct was provided, sync the Progress row and recompute topic mastery.
    if (typeof completionPct === "number") {
      const lessonId = session.lessonId;
      const topicId = session.lesson.topic.id;
      const subjectId = session.lesson.topic.subjectId;

      const existing = await db.progress.findUnique({
        where: { studentId_lessonId: { studentId: user.id, lessonId } },
      });

      const newTimeSpent = (existing?.timeSpentSec ?? 0) + (typeof durationSec === "number" ? durationSec : 0);
      const newStatus =
        completionPct >= 100 ? "COMPLETED" : existing?.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS";

      if (existing) {
        await db.progress.update({
          where: { id: existing.id },
          data: {
            completionPct: Math.max(existing.completionPct, completionPct),
            status: newStatus as any,
            timeSpentSec: newTimeSpent,
            lastAccessedAt: new Date(),
          },
        });
      } else {
        await db.progress.create({
          data: {
            studentId: user.id,
            lessonId,
            completionPct,
            status: newStatus as any,
            timeSpentSec: newTimeSpent,
            lastAccessedAt: new Date(),
          },
        });
      }

      // Recompute topic-level mastery: lessonsCompleted / lessonsTotal in this topic.
      const lessonsInTopic = await db.lesson.findMany({
        where: { topicId },
        select: { id: true },
      });
      const lessonIds = lessonsInTopic.map((l) => l.id);
      const lessonsTotal = lessonIds.length;
      const lessonsCompleted =
        lessonsTotal > 0
          ? await db.progress.count({
              where: {
                studentId: user.id,
                lessonId: { in: lessonIds },
                status: "COMPLETED",
              },
            })
          : 0;
      const level = lessonsTotal > 0 ? Math.round((lessonsCompleted / lessonsTotal) * 100) : 0;

      // Preserve avgExerciseScore; recompute from attempts to be safe.
      const topicExercises = await db.exercise.findMany({
        where: { lesson: { topicId } },
        select: { id: true },
      });
      const exerciseIds = topicExercises.map((e) => e.id);
      const attempts =
        exerciseIds.length > 0
          ? await db.exerciseAttempt.findMany({
              where: { studentId: user.id, exerciseId: { in: exerciseIds } },
              select: { percentage: true },
            })
          : [];
      const avgExerciseScore =
        attempts.length > 0
          ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length)
          : 0;

      await db.mastery.upsert({
        where: {
          studentId_subjectId_topicId: { studentId: user.id, subjectId, topicId },
        },
        create: {
          studentId: user.id,
          subjectId,
          topicId,
          level,
          lessonsCompleted,
          lessonsTotal,
          avgExerciseScore,
        },
        update: {
          level,
          lessonsCompleted,
          lessonsTotal,
          avgExerciseScore,
        },
      });
    }

    const updated = await db.learningSession.findUnique({
      where: { id },
      include: {
        lesson: {
          include: {
            topic: { include: { subject: { select: { title: true, color: true } } } },
          },
        },
      },
    });

    return Response.json(toSessionDTO(updated));
  } catch (err) {
    console.error("[sessions/PUT] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
