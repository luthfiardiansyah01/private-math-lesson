import { NextRequest } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { requireTutor } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { id } = await params;

  const attachment = await db.lessonAttachment.findUnique({
    where: { id },
    include: {
      lesson: { include: { topic: { include: { subject: { select: { tutorId: true } } } } } },
    },
  });

  if (!attachment || attachment.lesson.topic.subject.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Delete from disk
  try {
    const filePath = path.join(process.cwd(), "public", "uploads", attachment.storedName);
    await unlink(filePath);
  } catch {
    // File may already be missing — continue with DB deletion
  }

  await db.lessonAttachment.delete({ where: { id } });
  return Response.json({ ok: true });
}
