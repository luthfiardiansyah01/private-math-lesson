import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireTutor } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  try {
    const body = await req.json();
    const { exerciseId, text, options, correctAnswer, explanation, points, order } = body ?? {};

    if (!exerciseId || !text || typeof text !== "string" || typeof correctAnswer !== "string") {
      return Response.json(
        { error: "exerciseId, text, and correctAnswer are required" },
        { status: 400 }
      );
    }

    const exercise = await db.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        lesson: { include: { topic: { include: { subject: { select: { tutorId: true } } } } } },
      },
    });
    if (!exercise || exercise.lesson.topic.subject.tutorId !== user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const question = await db.question.create({
      data: {
        exerciseId,
        text,
        options: Array.isArray(options) ? JSON.stringify(options.map(String)) : null,
        correctAnswer,
        explanation: typeof explanation === "string" ? explanation : null,
        points: typeof points === "number" ? points : 1,
        order: typeof order === "number" ? order : 0,
      },
    });

    return Response.json(
      {
        ...question,
        options: question.options ? JSON.parse(question.options) : null,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[questions/POST] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
