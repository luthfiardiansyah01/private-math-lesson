import { NextRequest } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { requireTutor } from "@/lib/auth";

// PATCH /api/subjects/[id]/references/[refId] — retry processing
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; refId: string }> }
) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { id: subjectId, refId } = await params;

  const ref = await db.subjectReference.findUnique({
    where: { id: refId },
    include: { subject: { select: { tutorId: true } } },
  });

  if (!ref || ref.subjectId !== subjectId || ref.subject.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return Response.json({ error: "OPENROUTER_API_KEY belum dikonfigurasi" }, { status: 500 });

  // Reset ke PROCESSING dan hapus chapters lama
  await db.$transaction([
    db.referenceChapter.deleteMany({ where: { referenceId: refId } }),
    db.subjectReference.update({
      where: { id: refId },
      data: { status: "PROCESSING", errorMsg: null },
    }),
  ]);

  // Re-trigger processing (import dari route utama)
  const { processReferenceById } = await import("@/app/api/subjects/[id]/references/processor");
  processReferenceById(refId, ref.storedName, ref.title, apiKey).catch(console.error);

  return Response.json({ ok: true, status: "PROCESSING" });
}

// DELETE /api/subjects/[id]/references/[refId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; refId: string }> }
) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { id: subjectId, refId } = await params;

  const ref = await db.subjectReference.findUnique({
    where: { id: refId },
    include: { subject: { select: { tutorId: true } } },
  });

  if (!ref || ref.subjectId !== subjectId || ref.subject.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Hapus file dari disk
  try {
    const filePath = path.join(process.cwd(), "public", "uploads", "references", ref.storedName);
    await unlink(filePath);
  } catch {
    // File sudah tidak ada, lanjut
  }

  await db.subjectReference.delete({ where: { id: refId } });

  return Response.json({ ok: true });
}

// GET /api/subjects/[id]/references/[refId] — poll status + chapters
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; refId: string }> }
) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { id: subjectId, refId } = await params;

  const ref = await db.subjectReference.findUnique({
    where: { id: refId },
    include: {
      subject: { select: { tutorId: true } },
      chapters: { orderBy: { order: "asc" }, select: { id: true, title: true, order: true } },
    },
  });

  if (!ref || ref.subjectId !== subjectId || ref.subject.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(ref);
}
