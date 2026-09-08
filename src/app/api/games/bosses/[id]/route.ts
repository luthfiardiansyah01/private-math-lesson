import { NextRequest } from "next/server";
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

// GET /api/games/bosses/[id] — single boss by id (with parsed questions)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStudent();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const boss = await db.boss.findUnique({ where: { id } });
  if (!boss) {
    return Response.json({ error: "Boss not found" }, { status: 404 });
  }

  const dto: BossDTO = {
    id: boss.id,
    name: boss.name,
    description: boss.description,
    subjectId: boss.subjectId,
    hp: boss.hp,
    attack: boss.attack,
    icon: boss.icon,
    color: boss.color,
    difficulty: boss.difficulty,
    rewardXP: boss.rewardXP,
    questions: parseQuestions(boss.questions),
  };

  return Response.json(dto);
}
