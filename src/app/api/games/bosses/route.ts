import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import type { BossDTO, BossQuestion } from "@/lib/game-types";

function parseQuestions(s: string): BossQuestion[] {
  try {
    const v = JSON.parse(s);
    if (!Array.isArray(v)) return [];
    return v
      .filter((q) => q && typeof q === "object" && typeof q.text === "string")
      .map((q) => ({
        text: String(q.text),
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        correctAnswer: String(q.correctAnswer ?? ""),
        explanation: q.explanation == null ? null : String(q.explanation),
      }));
  } catch {
    return [];
  }
}

// GET /api/games/bosses — all bosses (with parsed questions, including correctAnswer)
export async function GET() {
  const auth = await requireStudent();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const bosses = await db.boss.findMany();
  const dtos: BossDTO[] = bosses.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    subjectId: b.subjectId,
    hp: b.hp,
    attack: b.attack,
    icon: b.icon,
    color: b.color,
    difficulty: b.difficulty,
    rewardXP: b.rewardXP,
    questions: parseQuestions(b.questions),
  }));

  return Response.json(dtos);
}
