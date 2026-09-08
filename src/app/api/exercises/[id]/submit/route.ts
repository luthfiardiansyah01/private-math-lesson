import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import type { AttemptResultDTO } from "@/lib/types";

function parseOptions(s: string | null): string[] | null {
  if (!s) return null;
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : null;
  } catch {
    return null;
  }
}

// Normalize an answer so MCQ-by-index and MCQ-by-value comparisons line up.
function normalizeAnswer(raw: string, options: string[] | null): string {
  const trimmed = (raw ?? "").trim().toLowerCase();
  if (options && options.length > 0) {
    const idx = Number(trimmed);
    if (!Number.isNaN(idx) && Number.isInteger(idx) && idx >= 0 && idx < options.length) {
      return options[idx].trim().toLowerCase();
    }
    const found = options.find((o) => o.trim().toLowerCase() === trimmed);
    if (found) return found.trim().toLowerCase();
  }
  return trimmed;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStudent();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { id: exerciseId } = await params;

  try {
    const body = await req.json();
    const answers: { questionId: string; answer: string }[] = Array.isArray(body?.answers)
      ? body.answers
      : [];

    if (answers.length === 0) {
      return Response.json({ error: "No answers provided" }, { status: 400 });
    }

    const exercise = await db.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        questions: { orderBy: { order: "asc" } },
        lesson: { include: { topic: { select: { id: true, subjectId: true } } } },
      },
    });

    if (!exercise) {
      return Response.json({ error: "Exercise not found" }, { status: 404 });
    }

    const topicId = exercise.lesson.topic.id;
    const subjectId = exercise.lesson.topic.subjectId;

    // Build a quick lookup of student answers by questionId.
    const answerMap = new Map<string, string>();
    for (const a of answers) {
      if (a && typeof a.questionId === "string") {
        answerMap.set(a.questionId, String(a.answer ?? ""));
      }
    }

    let score = 0;
    let totalPoints = 0;
    const details: AttemptResultDTO["details"] = [];

    for (const q of exercise.questions) {
      totalPoints += q.points;
      const options = parseOptions(q.options);
      const correctNorm = normalizeAnswer(q.correctAnswer, options);
      const rawAnswer = answerMap.get(q.id) ?? "";
      const answerNorm = normalizeAnswer(rawAnswer, options);
      const correct = correctNorm !== "" && answerNorm === correctNorm;
      if (correct) score += q.points;
      details.push({
        questionId: q.id,
        correct,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        yourAnswer: rawAnswer,
      });
    }

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passed = percentage >= 70;

    const attempt = await db.exerciseAttempt.create({
      data: {
        studentId: user.id,
        exerciseId,
        answers: JSON.stringify(answers),
        score,
        totalPoints,
        percentage,
        passed,
      },
    });

    // Recompute avg exercise score across all attempts for exercises in this topic.
    const topicExercises = await db.exercise.findMany({
      where: { lesson: { topicId } },
      select: { id: true },
    });
    const exerciseIds = topicExercises.map((e) => e.id);
    const allTopicAttempts =
      exerciseIds.length > 0
        ? await db.exerciseAttempt.findMany({
            where: { studentId: user.id, exerciseId: { in: exerciseIds } },
            select: { percentage: true },
          })
        : [];
    const avgExerciseScore =
      allTopicAttempts.length > 0
        ? Math.round(
            allTopicAttempts.reduce((s, a) => s + a.percentage, 0) / allTopicAttempts.length
          )
        : 0;

    // Topic-level mastery: topicId is non-null so we can use the composite unique upsert.
    const lessonsInTopic = await db.lesson.findMany({
      where: { topicId },
      select: { id: true },
    });
    const lessonIds = lessonsInTopic.map((l) => l.id);
    const completedProgress =
      lessonIds.length > 0
        ? await db.progress.count({
            where: {
              studentId: user.id,
              lessonId: { in: lessonIds },
              status: "COMPLETED",
            },
          })
        : 0;
    const lessonsTotal = lessonIds.length;
    const level = lessonsTotal > 0 ? Math.round((completedProgress / lessonsTotal) * 100) : 0;

    await db.mastery.upsert({
      where: {
        studentId_subjectId_topicId: { studentId: user.id, subjectId, topicId },
      },
      create: {
        studentId: user.id,
        subjectId,
        topicId,
        level,
        lessonsCompleted: completedProgress,
        lessonsTotal,
        avgExerciseScore,
      },
      update: {
        level,
        lessonsCompleted: completedProgress,
        lessonsTotal,
        avgExerciseScore,
      },
    });

    return Response.json({
      attemptId: attempt.id,
      score,
      totalPoints,
      percentage,
      passed,
      details,
    });
  } catch (err) {
    console.error("[exercises/submit] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
