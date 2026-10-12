import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireTutor } from "@/lib/auth";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-opus-4-5";

const DIFFICULTY_MAP: Record<string, string> = {
  EASY:   "mudah (level SD/SMP awal)",
  MEDIUM: "sedang (level SMP)",
  HARD:   "sulit (level SMA/olimpiade)",
  MIXED:  "campuran (easy 30%, medium 50%, hard 20%)",
};

// POST /api/exercises/[id]/generate-questions
// Body: { count, difficulty, instruction, chapterIds: string[] }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { id: exerciseId } = await params;

  const exercise = await db.exercise.findUnique({
    where: { id: exerciseId },
    include: {
      lesson: {
        include: {
          topic: {
            include: {
              subject: { select: { id: true, tutorId: true, title: true } },
            },
          },
        },
      },
    },
  });

  if (!exercise || exercise.lesson.topic.subject.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENROUTER_API_KEY belum dikonfigurasi" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const count      = Math.min(20, Math.max(1, Number(body.count) || 5));
  const difficulty = (body.difficulty as string) || "MEDIUM";
  const instruction = (body.instruction as string || "").trim();
  const chapterIds  = Array.isArray(body.chapterIds) ? (body.chapterIds as string[]) : [];

  if (!DIFFICULTY_MAP[difficulty]) {
    return Response.json({ error: "difficulty tidak valid" }, { status: 400 });
  }

  const subjectId = exercise.lesson.topic.subject.id;
  const subjectTitle = exercise.lesson.topic.subject.title;

  // Ambil konten chapter yang dipilih
  let chapterContents: { title: string; content: string }[] = [];

  if (chapterIds.length > 0) {
    const chapters = await db.referenceChapter.findMany({
      where: {
        id: { in: chapterIds },
        reference: { subjectId },
      },
      orderBy: { order: "asc" },
      select: { title: true, content: true },
    });
    chapterContents = chapters;
  }

  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  // Build konteks dari chapters yang dipilih
  let contextSection = "";
  const refLabels: string[] = [];

  if (chapterContents.length > 0) {
    const blocks = chapterContents.map((ch, i) => {
      refLabels.push(ch.title);
      return `=== ${i + 1}. ${ch.title} ===\n\n${ch.content}\n\n=== Akhir ${ch.title} ===`;
    });
    contextSection = `Konteks materi dari buku referensi (bab yang dipilih):\n\n${blocks.join("\n\n")}\n\nPENTING: Soal harus bersumber dari konten bab di atas.`;
  } else {
    contextSection = `Tidak ada bab referensi yang dipilih. Buat soal berdasarkan topik mata pelajaran "${subjectTitle}".`;
  }

  const exerciseTypeInstruction =
    exercise.type === "MCQ"
      ? `Tipe soal: Pilihan Ganda (MCQ). Setiap soal harus memiliki 4 pilihan jawaban (A, B, C, D).`
      : exercise.type === "TRUE_FALSE"
      ? `Tipe soal: Benar/Salah. Setiap soal jawaban hanya "Benar" atau "Salah".`
      : `Tipe soal: Jawaban Singkat. Tidak perlu pilihan jawaban.`;

  const difficultyInstruction = `Tingkat kesulitan: ${DIFFICULTY_MAP[difficulty]}`;
  const customInstruction = instruction ? `\nInstruksi khusus dari tutor:\n"${instruction}"\n` : "";

  const prompt = `Buat TEPAT ${count} soal latihan untuk:
- Mata pelajaran: ${subjectTitle}
- Judul lesson: ${exercise.lesson.title}
- Judul latihan: ${exercise.title}
${exerciseTypeInstruction}
${difficultyInstruction}
${customInstruction}

${contextSection}

Format respons HARUS berupa JSON array berikut (tanpa teks lain di luar blok JSON):
\`\`\`json
[
  {
    "text": "Teks soal lengkap",
    "options": ["A. opsi satu", "B. opsi dua", "C. opsi tiga", "D. opsi empat"],
    "correctAnswer": "A. opsi satu",
    "explanation": "Penjelasan mengapa jawaban ini benar",
    "difficulty": "EASY"
  }
]
\`\`\`

Catatan:
- Untuk TRUE_FALSE: options = ["Benar", "Salah"], correctAnswer = "Benar" atau "Salah"
- Untuk SHORT_ANSWER: options = [], correctAnswer = jawaban singkat
- difficulty per soal: "EASY", "MEDIUM", atau "HARD"
- Jika MIXED: variasikan difficulty sesuai proporsi 30%/50%/20%
- Tulis semua soal dalam Bahasa Indonesia
- Pastikan jumlah soal TEPAT ${count} buah`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXTAUTH_URL ?? "http://localhost:3000",
        "X-Title": "HIKABRIDGE Question Generator",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        messages: [
          {
            role: "system",
            content: `Kamu adalah asisten pembuat soal matematika untuk tutor privat.
Buat soal yang jelas, akurat, dan sesuai tingkat siswa SMP/SMA.
Selalu kembalikan respons dalam format JSON yang valid.
Gunakan Bahasa Indonesia yang baik dan benar.`,
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: `OpenRouter error ${response.status}: ${errText}` }, { status: 502 });
    }

    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    if (!text) return Response.json({ error: "Model tidak menghasilkan konten" }, { status: 500 });

    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
    const raw = jsonMatch ? jsonMatch[1] : text;

    let questions: {
      text: string;
      options?: string[];
      correctAnswer: string;
      explanation?: string;
      difficulty?: string;
    }[];

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Bukan array");
      questions = parsed;
    } catch {
      return Response.json({ error: "Format JSON dari AI tidak valid. Coba lagi." }, { status: 500 });
    }

    const existing = await db.question.findMany({
      where: { exerciseId },
      select: { order: true },
      orderBy: { order: "desc" },
    });
    let nextOrder = (existing[0]?.order ?? -1) + 1;

    const VALID_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];
    const defaultDiff = difficulty === "MIXED" ? "MEDIUM" : difficulty;

    const created = await db.$transaction(
      questions.map((q) => {
        const opts = Array.isArray(q.options) && q.options.length > 0 ? q.options : null;
        const diff = VALID_DIFFICULTIES.includes(q.difficulty ?? "") ? q.difficulty! : defaultDiff;
        const order = nextOrder++;
        return db.question.create({
          data: {
            exerciseId,
            text: q.text,
            options: opts ? JSON.stringify(opts) : null,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation ?? null,
            difficulty: diff,
            points: diff === "EASY" ? 10 : diff === "HARD" ? 20 : 15,
            order,
          },
        });
      })
    );

    return Response.json({
      created: created.length,
      questions: created,
      chaptersUsed: refLabels,
    });
  } catch (err) {
    console.error("[generate-questions] error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
