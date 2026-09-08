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

  const lesson = await db.lesson.findUnique({
    where: { id },
    include: { topic: { include: { subject: { select: { tutorId: true } } } } },
  });
  if (!lesson || lesson.topic.subject.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data: Record<string, string | number | null> = {};
    if ("title" in body && typeof body.title === "string") data.title = body.title;
    if ("content" in body && typeof body.content === "string") data.content = body.content;
    if ("summary" in body && (typeof body.summary === "string" || body.summary === null))
      data.summary = body.summary;
    if ("durationMin" in body && typeof body.durationMin === "number")
      data.durationMin = body.durationMin;
    if ("order" in body && typeof body.order === "number") data.order = body.order;

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await db.lesson.update({ where: { id }, data });
    return Response.json(updated);
  } catch (err) {
    console.error("[lessons/PUT] error:", err);
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

  const lesson = await db.lesson.findUnique({
    where: { id },
    include: { topic: { include: { subject: { select: { tutorId: true } } } } },
  });
  if (!lesson || lesson.topic.subject.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await db.lesson.delete({ where: { id } });
  return Response.json({ ok: true });
}
