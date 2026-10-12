import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { requireTutor } from "@/lib/auth";
import { processReferenceById } from "./processor";

// GET /api/subjects/[id]/references
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { id: subjectId } = await params;

  const subject = await db.subject.findUnique({ where: { id: subjectId } });
  if (!subject || subject.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const references = await db.subjectReference.findMany({
    where: { subjectId },
    include: { chapters: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(references);
}

// POST /api/subjects/[id]/references — upload PDF buku referensi
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { id: subjectId } = await params;

  const subject = await db.subject.findUnique({ where: { id: subjectId } });
  if (!subject || subject.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENROUTER_API_KEY belum dikonfigurasi" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string || "").trim();

  if (!file || file.size === 0) {
    return Response.json({ error: "File PDF wajib diupload" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return Response.json({ error: "Hanya file PDF yang didukung" }, { status: 400 });
  }
  if (file.size > 50 * 1024 * 1024) {
    return Response.json({ error: "Ukuran file maksimal 50 MB" }, { status: 400 });
  }

  const ext = ".pdf";
  const storedName = crypto.randomUUID().replace(/-/g, "") + ext;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "references");
  await mkdir(uploadDir, { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadDir, storedName), Buffer.from(bytes));

  // Buat record dengan status PROCESSING
  const reference = await db.subjectReference.create({
    data: {
      subjectId,
      title: title || file.name.replace(/\.pdf$/i, ""),
      filename: file.name,
      storedName,
      sizeBytes: file.size,
      status: "PROCESSING",
    },
  });

  // Proses ekstraksi chapter di background (async, tidak blocking response)
  processReferenceById(reference.id, storedName, reference.title, apiKey).catch((e) => {
    console.error("[reference] processing error:", e);
  });

  return Response.json(reference, { status: 201 });
}
