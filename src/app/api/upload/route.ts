import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { requireTutor } from "@/lib/auth";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const lessonId = formData.get("lessonId") as string | null;

  if (!file || !lessonId) {
    return Response.json({ error: "file and lessonId are required" }, { status: 400 });
  }

  // Verify tutor owns the lesson
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { topic: { include: { subject: { select: { tutorId: true } } } } },
  });
  if (!lesson || lesson.topic.subject.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const mimeType = file.type;
  const ext = ALLOWED_TYPES[mimeType];
  if (!ext) {
    return Response.json({ error: "Tipe file tidak didukung. Gunakan PDF atau gambar (PNG/JPG/WebP)." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: "Ukuran file maksimal 10 MB." }, { status: 400 });
  }

  const storedName = crypto.randomUUID().replace(/-/g, "") + ext;
  const uploadDir = path.join(process.cwd(), "public", "uploads");

  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadDir, storedName), Buffer.from(bytes));

  const attachment = await db.lessonAttachment.create({
    data: {
      lessonId,
      filename: file.name,
      storedName,
      mimeType,
      sizeBytes: file.size,
    },
  });

  return Response.json(attachment);
}
