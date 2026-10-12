import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireTutor } from "@/lib/auth";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
};

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "file is required" }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return Response.json({ error: "Tipe file tidak didukung. Gunakan PNG, JPG, atau WebP." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: "Ukuran gambar maksimal 5 MB." }, { status: 400 });
  }

  const storedName = crypto.randomUUID().replace(/-/g, "") + ext;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "questions");

  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadDir, storedName), Buffer.from(bytes));

  return Response.json({ imageUrl: `/uploads/questions/${storedName}` }, { status: 201 });
}
