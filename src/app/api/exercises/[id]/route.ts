import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireTutor } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { id } = await params;

  const exercise = await db.exercise.findUnique({
    where: { id },
    include: {
      lesson: { include: { topic: { include: { subject: { select: { tutorId: true } } } } } },
    },
  });
  if (!exercise || exercise.lesson.topic.subject.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data: Record<string, string | number> = {};
    if ("title" in body && typeof body.title === "string") data.title = body.title;
    if ("type" in body && typeof body.type === "string") {
      if (!["MCQ", "TRUE_FALSE", "SHORT_ANSWER"].includes(body.type)) {
        return Response.json({ error: "Invalid type" }, { status: 400 });
      }
      data.type = body.type;
    }
    if ("quizType" in body && typeof body.quizType === "string") {
      if (!["REGULAR", "PENGAYAAN", "REMEDIAL"].includes(body.quizType)) {
        return Response.json({ error: "Invalid quizType" }, { status: 400 });
      }
      data.quizType = body.quizType;
    }
    if ("kkm" in body && typeof body.kkm === "number" && body.kkm >= 0 && body.kkm <= 100) {
      data.kkm = body.kkm;
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await db.exercise.update({ where: { id }, data });
    return Response.json(updated);
  } catch (err) {
    console.error("[exercises/PUT] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { id } = await params;

  const exercise = await db.exercise.findUnique({
    where: { id },
    include: {
      lesson: { include: { topic: { include: { subject: { select: { tutorId: true } } } } } },
    },
  });
  if (!exercise || exercise.lesson.topic.subject.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await db.exercise.delete({ where: { id } });
  return Response.json({ ok: true });
}
