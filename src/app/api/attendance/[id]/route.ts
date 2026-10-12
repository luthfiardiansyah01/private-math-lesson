import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireTutor } from "@/lib/auth";

// POST /api/attendance/[id]/feedback — student kirim feedback
// PUT  /api/attendance/[id]          — tutor update absensi
// DELETE /api/attendance/[id]        — tutor hapus absensi

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;
  const { id } = await params;

  const record = await db.attendance.findUnique({ where: { id } });
  if (!record || record.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("status" in body && ["PRESENT", "ABSENT", "LATE"].includes(body.status)) data.status = body.status;
  if ("location" in body) data.location = body.location ?? null;
  if ("notes" in body) data.notes = body.notes ?? null;

  const updated = await db.attendance.update({ where: { id }, data });
  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;
  const { id } = await params;

  const record = await db.attendance.findUnique({ where: { id } });
  if (!record || record.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await db.attendance.delete({ where: { id } });
  return Response.json({ ok: true });
}
