import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const lessonId = req.nextUrl.searchParams.get("lessonId");
  if (!lessonId) return Response.json({ error: "lessonId required" }, { status: 400 });

  const attachments = await db.lessonAttachment.findMany({
    where: { lessonId },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(attachments);
}
