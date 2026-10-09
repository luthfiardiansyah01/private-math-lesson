import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireTutor } from "@/lib/auth";

const VALID_TYPES = new Set(["MCQ", "TRUE_FALSE", "SHORT_ANSWER"]);
const VALID_QUIZ_TYPES = new Set(["REGULAR", "PENGAYAAN", "REMEDIAL"]);

export async function POST(req: NextRequest) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  try {
    const body = await req.json();
    const { lessonId, title, type, quizType, kkm } = body ?? {};

    if (!lessonId || !title || typeof title !== "string") {
      return Response.json({ error: "lessonId and title are required" }, { status: 400 });
    }
    if (!type || !VALID_TYPES.has(type)) {
      return Response.json(
        { error: "type must be MCQ, TRUE_FALSE, or SHORT_ANSWER" },
        { status: 400 }
      );
    }

    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: { topic: { include: { subject: { select: { tutorId: true } } } } },
    });
    if (!lesson || lesson.topic.subject.tutorId !== user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const resolvedQuizType = quizType && VALID_QUIZ_TYPES.has(quizType) ? quizType : "REGULAR";
    const resolvedKkm = typeof kkm === "number" && kkm >= 0 && kkm <= 100 ? kkm : 75;

    const exercise = await db.exercise.create({
      data: {
        title: title.trim(),
        type,
        quizType: resolvedQuizType,
        kkm: resolvedKkm,
        lessonId,
      },
    });

    return Response.json(exercise, { status: 201 });
  } catch (err) {
    console.error("[exercises/POST] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
