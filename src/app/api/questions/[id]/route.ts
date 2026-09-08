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

  const question = await db.question.findUnique({
    where: { id },
    include: {
      exercise: {
        include: {
          lesson: { include: { topic: { include: { subject: { select: { tutorId: true } } } } } },
        },
      },
    },
  });
  if (!question || question.exercise.lesson.topic.subject.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data: Record<string, string | number | null> = {};
    if ("text" in body && typeof body.text === "string") data.text = body.text;
    if ("options" in body) {
      if (Array.isArray(body.options)) data.options = JSON.stringify(body.options.map(String));
      else if (body.options === null) data.options = null;
    }
    if ("correctAnswer" in body && typeof body.correctAnswer === "string")
      data.correctAnswer = body.correctAnswer;
    if ("explanation" in body && (typeof body.explanation === "string" || body.explanation === null))
      data.explanation = body.explanation;
    if ("points" in body && typeof body.points === "number") data.points = body.points;
    if ("order" in body && typeof body.order === "number") data.order = body.order;

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await db.question.update({ where: { id }, data });
    return Response.json({
      ...updated,
      options: updated.options ? JSON.parse(updated.options) : null,
    });
  } catch (err) {
    console.error("[questions/PUT] error:", err);
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

  const question = await db.question.findUnique({
    where: { id },
    include: {
      exercise: {
        include: {
          lesson: { include: { topic: { include: { subject: { select: { tutorId: true } } } } } },
        },
      },
    },
  });
  if (!question || question.exercise.lesson.topic.subject.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await db.question.delete({ where: { id } });
  return Response.json({ ok: true });
}
