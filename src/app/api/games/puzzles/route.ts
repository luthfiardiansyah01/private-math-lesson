import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import type { PuzzleDTO } from "@/lib/game-types";

function parseOptions(s: string | null): string[] | null {
  if (!s) return null;
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : null;
  } catch {
    return null;
  }
}

// GET /api/games/puzzles — random puzzles from the DB for the Math Puzzle game.
// ?count=5 (default 5)
export async function GET(req: NextRequest) {
  const auth = await requireStudent();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const rawCount = Number(searchParams.get("count") ?? "5");
  const count = Number.isNaN(rawCount) ? 5 : Math.max(1, Math.min(50, Math.floor(rawCount)));

  // Fetch all puzzles (the seeded set is small) then shuffle in-memory and take `count`.
  const all = await db.puzzle.findMany();
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  const picked = all.slice(0, count);

  const dtos: PuzzleDTO[] = picked.map((p) => ({
    id: p.id,
    type: p.type,
    question: p.question,
    options: parseOptions(p.options),
    answer: p.answer,
    explanation: p.explanation,
    difficulty: p.difficulty,
    xpReward: p.xpReward,
  }));

  return Response.json(dtos);
}
