import { NextRequest } from "next/server";
import { requireStudent } from "@/lib/auth";
import type { MathRushQuestion } from "@/lib/game-types";

type Difficulty = "easy" | "medium" | "hard";
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function randInt(min: number, max: number): number {
  // inclusive
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface RawQuestion {
  text: string;
  answer: number;
}

function generateRaw(difficulty: Difficulty): RawQuestion {
  if (difficulty === "easy") {
    // + and - with small numbers 1-20
    const op = pick(["+", "-"]);
    const a = randInt(1, 20);
    const b = randInt(1, 20);
    if (op === "+") return { text: `${a} + ${b} = ?`, answer: a + b };
    // ensure non-negative
    const [x, y] = a >= b ? [a, b] : [b, a];
    return { text: `${x} − ${y} = ?`, answer: x - y };
  }
  if (difficulty === "medium") {
    // +,-,× with numbers 1-12
    const op = pick(["+", "-", "×"]);
    const a = randInt(1, 12);
    const b = randInt(1, 12);
    if (op === "+") return { text: `${a} + ${b} = ?`, answer: a + b };
    if (op === "-") {
      const [x, y] = a >= b ? [a, b] : [b, a];
      return { text: `${x} − ${y} = ?`, answer: x - y };
    }
    return { text: `${a} × ${b} = ?`, answer: a * b };
  }
  // hard: all operations including ÷ with numbers up to 25
  const op = pick(["+", "-", "×", "÷"]);
  if (op === "+") {
    const a = randInt(1, 25);
    const b = randInt(1, 25);
    return { text: `${a} + ${b} = ?`, answer: a + b };
  }
  if (op === "-") {
    const a = randInt(1, 25);
    const b = randInt(1, 25);
    const [x, y] = a >= b ? [a, b] : [b, a];
    return { text: `${x} − ${y} = ?`, answer: x - y };
  }
  if (op === "×") {
    const a = randInt(2, 12);
    const b = randInt(2, 12);
    return { text: `${a} × ${b} = ?`, answer: a * b };
  }
  // ÷ — generate divisor & quotient, then dividend = divisor * quotient (clean division)
  const divisor = randInt(2, 12);
  const quotient = randInt(2, 12);
  const dividend = divisor * quotient;
  return { text: `${dividend} ÷ ${divisor} = ?`, answer: quotient };
}

function buildOptions(answer: number): number[] {
  const opts = new Set<number>([answer]);
  let guard = 0;
  while (opts.size < 4 && guard < 50) {
    guard++;
    const delta = randInt(1, 5);
    const sign = Math.random() < 0.5 ? -1 : 1;
    const candidate = answer + sign * delta;
    if (candidate >= 0 && candidate !== answer) opts.add(candidate);
  }
  // If we somehow didn't fill 4 options (e.g., answer very small), pad with larger offsets.
  let offset = 6;
  while (opts.size < 4) {
    const candidate = answer + offset;
    if (!opts.has(candidate)) opts.add(candidate);
    offset++;
  }
  // Shuffle to randomize position of the correct answer.
  const arr = Array.from(opts);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// GET /api/games/math-rush — generate a set of arithmetic questions.
// ?count=20 (default 20, max 40), ?difficulty=easy|medium|hard (default medium)
export async function GET(req: NextRequest) {
  const auth = await requireStudent();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const rawCount = Number(searchParams.get("count") ?? "20");
  const count = Number.isNaN(rawCount)
    ? 20
    : Math.max(1, Math.min(40, Math.floor(rawCount)));

  const rawDiff = (searchParams.get("difficulty") ?? "medium").toLowerCase();
  const difficulty: Difficulty = DIFFICULTIES.includes(rawDiff as Difficulty)
    ? (rawDiff as Difficulty)
    : "medium";

  const questions: MathRushQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const raw = generateRaw(difficulty);
    questions.push({
      id: i + 1,
      text: raw.text,
      answer: raw.answer,
      options: buildOptions(raw.answer),
    });
  }

  return Response.json({ questions, durationSec: 60 });
}
