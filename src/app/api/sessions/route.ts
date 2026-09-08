import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import type { SessionDTO } from "@/lib/types";

function toSessionDTO(
  s: any
): SessionDTO {
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

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  try {
    const body = await req.json();
    const { lessonId } = body ?? {};

    if (!lessonId || typeof lessonId !== "string") {
      return Response.json({ error: "lessonId is required" }, { status: 400 });
    }

    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: { topic: { include: { subject: { select: { title: true, color: true } } } } },
    });
    if (!lesson) {
      return Response.json({ error: "Lesson not found" }, { status: 404 });
    }

    const session = await db.learningSession.create({
      data: {
        studentId: user.id,
        lessonId,
        status: "IN_PROGRESS",
      },
      include: {
        lesson: {
          include: {
            topic: {
              include: { subject: { select: { title: true, color: true } } },
            },
          },
        },
      },
    });

    // Upsert progress: start the lesson if it was NOT_STARTED (or missing).
    const existing = await db.progress.findUnique({
      where: { studentId_lessonId: { studentId: user.id, lessonId } },
    });
    if (!existing) {
      await db.progress.create({
        data: {
          studentId: user.id,
          lessonId,
          status: "IN_PROGRESS",
          completionPct: 0,
          timeSpentSec: 0,
          lastAccessedAt: new Date(),
        },
      });
    } else if (existing.status === "NOT_STARTED") {
      await db.progress.update({
        where: { id: existing.id },
        data: { status: "IN_PROGRESS", lastAccessedAt: new Date() },
      });
    } else {
      await db.progress.update({
        where: { id: existing.id },
        data: { lastAccessedAt: new Date() },
      });
    }

    return Response.json({ sessionId: session.id, session: toSessionDTO(session) }, { status: 201 });
  } catch (err) {
    console.error("[sessions/POST] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
