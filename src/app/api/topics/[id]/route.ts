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

  const topic = await db.topic.findUnique({
    where: { id },
    include: { subject: { select: { tutorId: true } } },
  });
  if (!topic || topic.subject.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data: Record<string, string | number | null> = {};
    if ("title" in body && typeof body.title === "string") data.title = body.title;
    if ("description" in body && (typeof body.description === "string" || body.description === null))
      data.description = body.description;
    if ("order" in body && typeof body.order === "number") data.order = body.order;

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await db.topic.update({ where: { id }, data });
    return Response.json(updated);
  } catch (err) {
    console.error("[topics/PUT] error:", err);
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

  const topic = await db.topic.findUnique({
    where: { id },
    include: { subject: { select: { tutorId: true } } },
  });
  if (!topic || topic.subject.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await db.topic.delete({ where: { id } });
  return Response.json({ ok: true });
}
