import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { requireTutor } from "@/lib/auth";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
// Default model — tutor dapat diganti via env OPENROUTER_MODEL
const DEFAULT_MODEL = "anthropic/claude-opus-4-5";

type OpenRouterContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

async function extractPdfText(storedName: string): Promise<string> {
  const filePath = path.join(process.cwd(), "public", "uploads", storedName);
  const buffer = await readFile(filePath);
  // Dynamic import to avoid SSR issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await import("pdf-parse" as any);
  const pdfParse = mod.default ?? mod;
  const result = await pdfParse(buffer);
  return result.text.trim();
}

async function imageToDataUrl(storedName: string): Promise<string> {
  const filePath = path.join(process.cwd(), "public", "uploads", storedName);
  const buffer = await readFile(filePath);
  const mimeType = storedName.endsWith(".png")
    ? "image/png"
    : storedName.endsWith(".webp")
    ? "image/webp"
    : "image/jpeg";
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { id: lessonId } = await params;

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      topic: {
        include: { subject: { select: { tutorId: true, title: true } } },
      },
      attachments: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!lesson || lesson.topic.subject.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (lesson.attachments.length === 0) {
    return Response.json(
      { error: "Tidak ada referensi yang diunggah. Upload PDF atau gambar terlebih dahulu." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const generateType: "content" | "questions" = body.generateType ?? "content";

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENROUTER_API_KEY belum dikonfigurasi di server." }, { status: 500 });
  }

  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  // Build user message content blocks (OpenAI-compatible format)
  const contentBlocks: OpenRouterContentBlock[] = [];
  const referenceLabels: string[] = [];

  for (let i = 0; i < lesson.attachments.length; i++) {
    const att = lesson.attachments[i];
    const label = `Referensi ${i + 1}: "${att.filename}"`;
    referenceLabels.push(label);

    if (att.mimeType === "application/pdf") {
      try {
        const text = await extractPdfText(att.storedName);
        contentBlocks.push({
          type: "text",
          text: text
            ? `=== ${label} ===\n\n${text}\n\n=== Akhir ${label} ===`
            : `[${label} - Teks PDF tidak dapat diekstrak]`,
        });
      } catch {
        contentBlocks.push({ type: "text", text: `[${label} - Gagal membaca file]` });
      }
    } else {
      // Image — send as data URL (vision)
      try {
        const dataUrl = await imageToDataUrl(att.storedName);
        contentBlocks.push({ type: "text", text: `=== ${label} (gambar) ===` });
        contentBlocks.push({ type: "image_url", image_url: { url: dataUrl } });
        contentBlocks.push({ type: "text", text: `=== Akhir ${label} ===` });
      } catch {
        contentBlocks.push({ type: "text", text: `[${label} - Gagal membaca gambar]` });
      }
    }
  }

  const refListText = referenceLabels.map((r, i) => `${i + 1}. ${r}`).join("\n");

  let taskPrompt: string;

  if (generateType === "questions") {
    taskPrompt = `Tugas kamu adalah membuat soal latihan berdasarkan HANYA referensi yang diberikan di atas.

Judul pelajaran: "${lesson.title}"
Referensi yang digunakan:
${refListText}

ATURAN KETAT:
- Seluruh soal HARUS bersumber dari isi referensi yang diunggah. DILARANG menambahkan soal dari pengetahuan umum di luar referensi.
- Jika ada pertentangan antarreferensi, buat catatan singkat di awal.
- Jangan sertakan soal tentang topik yang tidak ada dalam referensi.

Buat 5-8 soal pilihan ganda (MCQ) dalam format JSON berikut:
\`\`\`json
[
  {
    "text": "Teks soal",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correctAnswer": "A. ...",
    "explanation": "Penjelasan singkat mengapa jawaban ini benar, dengan referensi ke sumber."
  }
]
\`\`\`

Hanya kembalikan blok JSON saja, tidak ada teks lain di luar blok JSON.`;
  } else {
    taskPrompt = `Tugas kamu adalah menyusun materi pelajaran dalam format Markdown berdasarkan HANYA referensi yang diberikan di atas.

Judul pelajaran: "${lesson.title}"
Referensi yang digunakan:
${refListText}

ATURAN KETAT:
1. Seluruh materi, penjelasan, contoh, dan latihan HARUS bersumber dari isi referensi yang diunggah.
2. DILARANG menambahkan materi dari pengetahuan umum di luar referensi.
3. Jika ada lebih dari satu referensi: gabungkan seluruh referensi sebagai dasar penyusunan. Jika ada informasi yang bertentangan antarreferensi, tandai dengan catatan: **⚠️ Catatan: Referensi X dan Y memiliki pendekatan berbeda tentang ini — [jelaskan perbedaannya].**
4. Jangan menyebutkan sumber di luar referensi yang diberikan (tidak ada "menurut para ahli", "secara umum", dll).

Susun materi dengan struktur Markdown berikut:
- Judul utama (# Judul Pelajaran)
- Pengantar singkat
- Konsep-konsep utama dengan penjelasan (## Konsep)
- Contoh-contoh (### Contoh) — langsung dari referensi
- Rangkuman

Hanya kembalikan konten Markdown saja, tidak ada kalimat pembuka seperti "Berikut adalah..." atau "Tentu, saya akan...".`;
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXTAUTH_URL ?? "http://localhost:3000",
        "X-Title": "Private Math Lesson",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        messages: [
          {
            role: "system",
            content: `Kamu adalah asisten pendidikan yang membantu tutor menyusun materi pelajaran.
Kamu HANYA boleh menggunakan informasi dari referensi yang diberikan oleh tutor.
DILARANG menggunakan pengetahuan umum di luar referensi tersebut.
Selalu tulis dalam Bahasa Indonesia yang jelas dan sesuai untuk pelajar.`,
          },
          {
            role: "user",
            content: [
              ...contentBlocks,
              { type: "text", text: "\n\n" + taskPrompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[generate] OpenRouter error:", response.status, errText);
      return Response.json(
        { error: `OpenRouter API error ${response.status}: ${errText}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";

    if (!text) {
      return Response.json({ error: "Model tidak menghasilkan konten." }, { status: 500 });
    }

    return Response.json({
      generated: text,
      generateType,
      referencesUsed: referenceLabels,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memanggil OpenRouter API";
    console.error("[generate] error:", err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
