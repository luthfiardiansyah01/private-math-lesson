import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// POST /api/attendance/[id]/feedback — student kirim feedback setelah sesi
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;
  const { id } = await params;

  const record = await db.attendance.findUnique({ where: { id } });
  if (!record) return Response.json({ error: "Not found" }, { status: 404 });

  // Hanya student yang bersangkutan yang bisa feedback
  if (user.role === "STUDENT" && record.studentId !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await db.attendanceFeedback.findUnique({ where: { attendanceId: id } });
  if (existing) {
    return Response.json({ error: "Feedback sudah dikirim" }, { status: 409 });
  }

  const body = await req.json();
  const mood   = body.mood ?? "GOOD";
  const rating = typeof body.rating === "number" ? Math.min(5, Math.max(1, body.rating)) : 5;
  const notes  = body.notes ?? null;

  if (!["GREAT", "GOOD", "OKAY", "BAD"].includes(mood)) {
    return Response.json({ error: "mood tidak valid" }, { status: 400 });
  }

  const feedback = await db.attendanceFeedback.create({
    data: { attendanceId: id, mood, rating, notes },
  });

  return Response.json(feedback, { status: 201 });
}
