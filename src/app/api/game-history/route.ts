import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import type { GameSessionDTO, GameType, GameStatus, GameMetadata } from "@/lib/game-types";

const ALLOWED_GAME_TYPES = new Set(["QUIZ", "MATH_RUSH", "MATH_PUZZLE", "BOSS_CHALLENGE"]);

function parseMetadata(s: string | null): GameMetadata | null {
  if (!s) return null;
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" ? (v as GameMetadata) : null;
  } catch {
    return null;
  }
}

// GET /api/game-history — most recent 50 game sessions for the current student.
// Optional ?gameType=QUIZ filter.
export async function GET(req: NextRequest) {
  const auth = await requireStudent();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const gameTypeParam = searchParams.get("gameType");

  const where: { studentId: string; gameType?: string } = { studentId: user.id };
  if (gameTypeParam && ALLOWED_GAME_TYPES.has(gameTypeParam)) {
    where.gameType = gameTypeParam;
  }

  const sessions = await db.gameSession.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const dtos: GameSessionDTO[] = sessions.map((s) => ({
    id: s.id,
    gameType: s.gameType as GameType,
    score: s.score,
    xpEarned: s.xpEarned,
    correctCount: s.correctCount,
    totalCount: s.totalCount,
    durationSec: s.durationSec,
    status: s.status as GameStatus,
    metadata: parseMetadata(s.metadata),
    createdAt: s.createdAt.toISOString(),
  }));

  return Response.json(dtos);
}
