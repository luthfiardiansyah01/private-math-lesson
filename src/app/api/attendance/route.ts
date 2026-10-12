import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireTutor } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// GET /api/attendance — list absensi
// Tutor: semua absensi yang dia buat
// Student: absensi miliknya sendiri
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (dateFrom || dateTo) {
    where.date = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  if (user.role === "TUTOR") {
    where.tutorId = user.id;
  } else {
    where.studentId = user.id;
  }

  const records = await db.attendance.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, email: true, grade: true } },
      tutor:   { select: { id: true, name: true } },
      feedback: true,
    },
    orderBy: { date: "desc" },
  });

  return Response.json(records);
}

// POST /api/attendance — tutor catat absensi (dengan foto opsional)
export async function POST(req: NextRequest) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const formData = await req.formData();
  const studentId = formData.get("studentId") as string;
  const date      = formData.get("date") as string;        // YYYY-MM-DD
  const status    = (formData.get("status") as string) || "PRESENT";
  const location  = (formData.get("location") as string) || null;
  const latitude  = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null;
  const longitude = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null;
  const notes     = (formData.get("notes") as string) || null;
  const photo     = formData.get("photo") as File | null;

  if (!studentId || !date) {
    return Response.json({ error: "studentId dan date wajib diisi" }, { status: 400 });
  }
  if (!["PRESENT", "ABSENT", "LATE"].includes(status)) {
    return Response.json({ error: "status tidak valid" }, { status: 400 });
  }

  let photoUrl: string | null = null;
  if (photo && photo.size > 0) {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(photo.type)) {
      return Response.json({ error: "Hanya JPG/PNG/WebP yang diizinkan" }, { status: 400 });
    }
    if (photo.size > 5 * 1024 * 1024) {
      return Response.json({ error: "Ukuran foto maksimal 5 MB" }, { status: 400 });
    }
    const ext = photo.type === "image/png" ? ".png" : photo.type === "image/webp" ? ".webp" : ".jpg";
    const filename = crypto.randomUUID().replace(/-/g, "") + ext;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "attendance");
    await mkdir(uploadDir, { recursive: true });
    const bytes = await photo.arrayBuffer();
    await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));
    photoUrl = `/uploads/attendance/${filename}`;
  }

  const record = await db.attendance.create({
    data: { tutorId: user.id, studentId, date, status, location, latitude, longitude, notes, photoUrl },
    include: {
      student: { select: { id: true, name: true, email: true, grade: true } },
      feedback: true,
    },
  });

  return Response.json(record, { status: 201 });
}
