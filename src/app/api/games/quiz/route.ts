import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";

interface QuizQuestionDTO {
  id: string;
  text: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string | null;
  subjectTitle: string;
  subjectColor: string;
}

function parseOptions(s: string | null): string[] | null {
  if (!s) return null;
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : null;
  } catch {
    return null;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// GET /api/games/quiz — build a quiz from existing exercise questions (Phase 1 content).
// ?subjectId=... (optional), ?count=10 (default 10, max 20)
export async function GET(req: NextRequest) {
  const auth = await requireStudent();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId") || undefined;
  const rawCount = Number(searchParams.get("count") ?? "10");
  const count = Number.isNaN(rawCount)
    ? 10
    : Math.max(1, Math.min(20, Math.floor(rawCount)));

  const questions = await db.question.findMany({
    where: subjectId
      ? { exercise: { lesson: { topic: { subjectId } } } }
      : undefined,
    include: {
      exercise: {
        include: {
          lesson: {
            include: {
              topic: {
                include: {
                  subject: true,
                },
              },
            },
          },
        },
      },
    },
    take: 200,
  });

  const shuffled = shuffle(questions).slice(0, count);

  const dtos: QuizQuestionDTO[] = shuffled.map((q) => ({
    id: q.id,
    text: q.text,
    options: parseOptions(q.options),
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    subjectTitle: q.exercise?.lesson?.topic?.subject?.title ?? "Umum",
    subjectColor: q.exercise?.lesson?.topic?.subject?.color ?? "emerald",
  }));

  return Response.json({ questions: dtos, durationPerQuestionSec: 30 });
}
