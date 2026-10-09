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

// Poin multiplier per difficulty
const DIFFICULTY_MULTIPLIER: Record<string, number> = {
  EASY: 1,
  MEDIUM: 1.5,
  HARD: 2,
};

// Bonus poin berdasarkan hasil
function calcBonusMultiplier(percentage: number, passed: boolean, attemptNo: number): number {
  if (!passed) return 0.5; // penalty untuk tidak lulus
  if (percentage === 100) return 2.0; // perfect score bonus
  if (percentage >= 90) return 1.5;
  if (percentage >= 80) return 1.2;
  if (attemptNo > 1) return 0.8; // retry penalty
  return 1.0;
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

    // Cek cooldown
    const now = new Date();
    const cooldown = await db.quizCooldown.findUnique({
      where: { studentId_exerciseId: { studentId: user.id, exerciseId } },
    });
    if (cooldown && cooldown.availableAt > now) {
      const waitSec = Math.ceil((cooldown.availableAt.getTime() - now.getTime()) / 1000);
      return Response.json(
        { error: "COOLDOWN", waitSec, availableAt: cooldown.availableAt },
        { status: 429 }
      );
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
    const kkm = exercise.kkm ?? 75;

    // Hitung attempt ke berapa
    const prevAttempts = await db.exerciseAttempt.count({
      where: { studentId: user.id, exerciseId },
    });
    const attemptNo = prevAttempts + 1;

    const answerMap = new Map<string, string>();
    for (const a of answers) {
      if (a && typeof a.questionId === "string") {
        answerMap.set(a.questionId, String(a.answer ?? ""));
      }
    }

    let rawScore = 0;
    let totalPoints = 0;
    const details: AttemptResultDTO["details"] = [];

    for (const q of exercise.questions) {
      const multiplier = DIFFICULTY_MULTIPLIER[q.difficulty] ?? 1;
      const weightedPoints = Math.round(q.points * multiplier);
      totalPoints += weightedPoints;

      const options = parseOptions(q.options);
      const correctNorm = normalizeAnswer(q.correctAnswer, options);
      const rawAnswer = answerMap.get(q.id) ?? "";
      const answerNorm = normalizeAnswer(rawAnswer, options);
      const correct = correctNorm !== "" && answerNorm === correctNorm;
      if (correct) rawScore += weightedPoints;

      details.push({
        questionId: q.id,
        correct,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        yourAnswer: rawAnswer,
      });
    }

    const percentage = totalPoints > 0 ? Math.round((rawScore / totalPoints) * 100) : 0;
    const passed = percentage >= kkm;

    // Routing: lulus → Pengayaan, tidak lulus → Remedial
    const routedTo = passed ? "PENGAYAAN" : "REMEDIAL";

    // Hitung poin yang benar-benar diperoleh
    const bonusMultiplier = calcBonusMultiplier(percentage, passed, attemptNo);
    const pointsEarned = Math.round(rawScore * bonusMultiplier);

    // Set cooldown jika remedial (5 menit)
    if (!passed) {
      const availableAt = new Date(now.getTime() + 5 * 60 * 1000);
      await db.quizCooldown.upsert({
        where: { studentId_exerciseId: { studentId: user.id, exerciseId } },
        create: { studentId: user.id, exerciseId, availableAt },
        update: { availableAt },
      });
    } else {
      // Lulus → hapus cooldown jika ada
      await db.quizCooldown.deleteMany({
        where: { studentId: user.id, exerciseId },
      });
    }

    const attempt = await db.exerciseAttempt.create({
      data: {
        studentId: user.id,
        exerciseId,
        answers: JSON.stringify(answers),
        score: rawScore,
        totalPoints,
        percentage,
        pointsEarned,
        passed,
        routedTo,
        attemptNo,
      },
    });

    // Update StudentStats: tambah poin
    await db.studentStats.upsert({
      where: { studentId: user.id },
      create: { studentId: user.id, totalPoints: pointsEarned },
      update: { totalPoints: { increment: pointsEarned } },
    });

    // Update mastery
    const lessonsInTopic = await db.lesson.findMany({
      where: { topicId },
      select: { id: true },
    });
    const lessonIds = lessonsInTopic.map((l) => l.id);
    const completedProgress = lessonIds.length > 0
      ? await db.progress.count({
          where: { studentId: user.id, lessonId: { in: lessonIds }, status: "COMPLETED" },
        })
      : 0;
    const lessonsTotal = lessonIds.length;
    const level = lessonsTotal > 0 ? Math.round((completedProgress / lessonsTotal) * 100) : 0;

    const topicExercises = await db.exercise.findMany({
      where: { lesson: { topicId } },
      select: { id: true },
    });
    const exerciseIds = topicExercises.map((e) => e.id);
    const allTopicAttempts = exerciseIds.length > 0
      ? await db.exerciseAttempt.findMany({
          where: { studentId: user.id, exerciseId: { in: exerciseIds } },
          select: { percentage: true },
        })
      : [];
    const avgExerciseScore = allTopicAttempts.length > 0
      ? Math.round(allTopicAttempts.reduce((s, a) => s + a.percentage, 0) / allTopicAttempts.length)
      : 0;

    await db.mastery.upsert({
      where: { studentId_subjectId_topicId: { studentId: user.id, subjectId, topicId } },
      create: { studentId: user.id, subjectId, topicId, level, lessonsCompleted: completedProgress, lessonsTotal, avgExerciseScore },
      update: { level, lessonsCompleted: completedProgress, lessonsTotal, avgExerciseScore },
    });

    return Response.json({
      attemptId: attempt.id,
      score: rawScore,
      totalPoints,
      percentage,
      passed,
      kkm,
      routedTo,
      pointsEarned,
      attemptNo,
      bonusMultiplier,
      details,
    });
  } catch (err) {
    console.error("[exercises/submit] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
