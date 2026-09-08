import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireTutor } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  try {
    const body = await req.json();
    const { topicId, title, content, summary, durationMin, order } = body ?? {};

    if (!topicId || !title || typeof title !== "string" || typeof content !== "string") {
      return Response.json(
        { error: "topicId, title and content are required" },
        { status: 400 }
      );
    }

    const topic = await db.topic.findUnique({
      where: { id: topicId },
      include: { subject: { select: { tutorId: true } } },
    });
    if (!topic || topic.subject.tutorId !== user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const lesson = await db.lesson.create({
      data: {
        title: title.trim(),
        content,
        summary: typeof summary === "string" ? summary : null,
        durationMin: typeof durationMin === "number" ? durationMin : 15,
        order: typeof order === "number" ? order : 0,
        topicId,
      },
    });

    return Response.json(lesson, { status: 201 });
  } catch (err) {
    console.error("[lessons/POST] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
