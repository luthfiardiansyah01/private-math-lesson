import { NextRequest } from "next/server";
import { requireStudent } from "@/lib/auth";
import { processGameSubmission } from "@/lib/game-engine";
import type { GameSubmitPayload, GameType, GameStatus, GameMetadata } from "@/lib/game-types";

const ALLOWED_GAME_TYPES: GameType[] = ["QUIZ", "MATH_RUSH", "MATH_PUZZLE", "BOSS_CHALLENGE"];
const ALLOWED_STATUSES: GameStatus[] = ["COMPLETED", "FAILED", "ABANDONED"];

function isGameType(v: unknown): v is GameType {
  return typeof v === "string" && (ALLOWED_GAME_TYPES as string[]).includes(v);
}
function isGameStatus(v: unknown): v is GameStatus {
  return typeof v === "string" && (ALLOWED_STATUSES as string[]).includes(v);
}

// POST /api/games/submit — process a game submission (XP, stats, achievements)
export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  try {
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    const gameType = body.gameType;
    const score = Number(body.score);
    const correctCount = Number(body.correctCount);
    const totalCount = Number(body.totalCount);
    const durationSec = Number(body.durationSec);
    const status = body.status;
    const maxStreak = body.maxStreak === undefined ? undefined : Number(body.maxStreak);
    const metadata = body.metadata as GameMetadata | undefined;

    if (!isGameType(gameType)) {
      return Response.json({ error: "Invalid gameType" }, { status: 400 });
    }
    if (!isGameStatus(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }
    if (Number.isNaN(score) || score < 0) {
      return Response.json({ error: "Invalid score" }, { status: 400 });
    }
    if (Number.isNaN(correctCount) || correctCount < 0) {
      return Response.json({ error: "Invalid correctCount" }, { status: 400 });
    }
    if (Number.isNaN(totalCount) || totalCount < 0) {
      return Response.json({ error: "Invalid totalCount" }, { status: 400 });
    }
    if (Number.isNaN(durationSec) || durationSec < 0) {
      return Response.json({ error: "Invalid durationSec" }, { status: 400 });
    }

    const payload: GameSubmitPayload = {
      gameType,
      score,
      correctCount,
      totalCount,
      durationSec,
      status,
      ...(maxStreak !== undefined && !Number.isNaN(maxStreak) ? { maxStreak } : {}),
      ...(metadata && typeof metadata === "object" ? { metadata } : {}),
    };

    const result = await processGameSubmission(user.id, payload);
    return Response.json(result, { status: 200 });
  } catch (err) {
    console.error("[games/submit] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
