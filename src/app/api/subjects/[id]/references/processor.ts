import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { db } from "@/lib/db";

const execFileAsync = promisify(execFile);
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-opus-4-5";

async function extractPdfText(storedName: string): Promise<string> {
  const filePath = path.join(process.cwd(), "public", "uploads", "references", storedName);
  const scriptPath = path.join(process.cwd(), "scripts", "pdf-extract.cjs");

  const { stdout } = await execFileAsync("node", [scriptPath, filePath], {
    maxBuffer: 100 * 1024 * 1024,
    timeout: 60_000,
    encoding: "utf8",
  });

  const result = JSON.parse(stdout) as { text?: string; error?: string };
  if (result.error) throw new Error(result.error);
  return (result.text ?? "").trim();
}

async function extractChaptersWithAI(
  pdfText: string,
  bookTitle: string,
  apiKey: string,
  model: string
): Promise<{ title: string; content: string; order: number }[]> {
  const prompt = `Kamu adalah asisten ekstraksi konten buku pelajaran matematika.

Berikut adalah teks dari buku berjudul "${bookTitle}".

Tugasmu:
1. Identifikasi dan ekstrak semua bab/chapter dari teks ini
2. Untuk setiap bab, sertakan judul bab dan SELURUH isi kontennya
3. Bab biasanya ditandai dengan "Bab", "BAB", "Chapter", "CHAPTER", angka romawi, atau angka diikuti judul
4. Sertakan semua definisi, teorema, contoh soal, latihan, dan penjelasan di dalam masing-masing bab

Kembalikan HANYA JSON array berikut (tanpa teks lain):
\`\`\`json
[
  {
    "order": 1,
    "title": "Judul Bab Lengkap",
    "content": "Seluruh isi konten bab ini secara lengkap..."
  }
]
\`\`\`

Teks buku:
${pdfText.slice(0, 80000)}`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      "X-Title": "HIKABRIDGE Reference Extractor",
    },
    body: JSON.stringify({
      model,
      max_tokens: 16000,
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah asisten yang mengekstrak struktur bab dari buku pelajaran. Selalu kembalikan JSON yang valid.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);

  const data = await response.json();
  const text: string = data.choices?.[0]?.message?.content ?? "";

  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
  const raw = jsonMatch ? jsonMatch[1] : text;

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("AI tidak mengembalikan array");
  return parsed;
}

export async function processReferenceById(
  referenceId: string,
  storedName: string,
  bookTitle: string,
  apiKey: string
) {
  try {
    const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
    const pdfText = await extractPdfText(storedName);

    if (!pdfText || pdfText.length < 100) {
      await db.subjectReference.update({
        where: { id: referenceId },
        data: { status: "ERROR", errorMsg: "PDF tidak dapat dibaca atau kosong" },
      });
      return;
    }

    const chapters = await extractChaptersWithAI(pdfText, bookTitle, apiKey, model);

    if (!chapters.length) {
      await db.subjectReference.update({
        where: { id: referenceId },
        data: { status: "ERROR", errorMsg: "Tidak ada bab yang terdeteksi" },
      });
      return;
    }

    await db.$transaction([
      ...chapters.map((ch) =>
        db.referenceChapter.create({
          data: {
            referenceId,
            title: ch.title,
            content: ch.content,
            order: ch.order,
          },
        })
      ),
      db.subjectReference.update({
        where: { id: referenceId },
        data: { status: "READY" },
      }),
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memproses referensi";
    await db.subjectReference.update({
      where: { id: referenceId },
      data: { status: "ERROR", errorMsg: msg },
    });
  }
}
