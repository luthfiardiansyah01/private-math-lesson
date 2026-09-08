import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireTutor } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  try {
    const body = await req.json();
    const { subjectId, title, description, order } = body ?? {};

    if (!subjectId || !title || typeof title !== "string") {
      return Response.json({ error: "subjectId and title are required" }, { status: 400 });
    }

    const subject = await db.subject.findUnique({ where: { id: subjectId } });
    if (!subject || subject.tutorId !== user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const topic = await db.topic.create({
      data: {
        title: title.trim(),
        description: typeof description === "string" ? description : null,
        order: typeof order === "number" ? order : 0,
        subjectId,
      },
    });

    return Response.json(topic, { status: 201 });
  } catch (err) {
    console.error("[topics/POST] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
