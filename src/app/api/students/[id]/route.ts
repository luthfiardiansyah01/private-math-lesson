import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireTutor } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTutor();
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!name || name.length > 100) {
      return Response.json(
        { error: "Nama wajib diisi dan maksimal 100 karakter" },
        { status: 400 }
      );
    }

    const student = await db.user.findFirst({
      where: {
        id,
        role: "STUDENT",
        progress: {
          some: {
            lesson: {
              topic: {
                subject: { tutorId: auth.user.id },
              },
            },
          },
        },
      },
      select: { id: true },
    });

    if (!student) {
      return Response.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    }

    const updated = await db.user.update({
      where: { id: student.id },
      data: { name },
      select: { id: true, name: true },
    });

    return Response.json(updated);
  } catch (error) {
    console.error("[students/PUT] error:", error);
    return Response.json({ error: "Gagal memperbarui nama siswa" }, { status: 500 });
  }
}