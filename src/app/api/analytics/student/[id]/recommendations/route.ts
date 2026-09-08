// Phase 3 Intelligence — Generate AI Learning Recommendation
// POST /api/analytics/student/[id]/recommendations
// Auth: TUTOR (any student) OR STUDENT (self).
// Uses z-ai-web-dev-sdk (LLM) to produce a markdown recommendation.
// Saves a Recommendation row and returns RecommendationDTO (201).

import { NextRequest } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  analyzeStudentPerformance,
  detectWeakTopics,
} from "@/lib/analytics-engine";
import type { RecommendationDTO } from "@/lib/analytics-types";

// Generate AI recommendation (markdown). Falls back to a static message on LLM error.
async function generateRecommendation(studentData: {
  name: string;
  level: number;
  avgMastery: number;
  weakTopics: { title: string; mastery: number }[];
  subjectPerformance: { title: string; mastery: number; trend: string }[];
  recentScores: { date: string; score: number }[];
}): Promise<string> {
  const fallback =
    "Rekomendasi sedang tidak tersedia. Fokus pada topik dengan penguasaan terendah dan kerjakan latihan tambahan secara konsisten setiap hari.";
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "Kamu adalah tutor AI yang ahli. Berikan rekomendasi pembelajaran yang spesifik, actionable, dan memotivasi dalam Bahasa Indonesia. Gunakan format markdown dengan poin-poin.",
        },
        {
          role: "user",
          content:
            `Data siswa:\n${JSON.stringify(studentData, null, 2)}\n\n` +
            `Berdasarkan data di atas, berikan 3-5 rekomendasi pembelajaran spesifik. ` +
            `Fokus pada topik yang lemah dan cara meningkatkan penguasaan. ` +
            `Format: markdown dengan heading ## dan bullet points.`,
        },
      ],
      thinking: { type: "disabled" },
    });
    const content = completion?.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim().length > 0
      ? content
      : fallback;
  } catch {
    return fallback;
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth)
    return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { id: studentId } = await params;

  // Authorization: tutor (any student), student (self only)
  if (user.role !== "TUTOR" && user.role !== "STUDENT")
    return Response.json(
      { error: "Forbidden: only tutor or student can generate recommendations" },
      { status: 403 }
    );
  if (user.role === "STUDENT" && user.id !== studentId)
    return Response.json(
      { error: "Forbidden: can only generate for yourself" },
      { status: 403 }
    );

  // Verify student exists
  const student = await db.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, role: true },
  });
  if (!student)
    return Response.json({ error: "Student not found" }, { status: 404 });
  if (student.role !== "STUDENT")
    return Response.json(
      { error: "Target user is not a student" },
      { status: 400 }
    );

  // Gather context
  const stats = await db.studentStats.findUnique({
    where: { studentId },
  });

  const subjectPerformance = await analyzeStudentPerformance(studentId);
  const weakTopics = await detectWeakTopics(studentId);

  // recent attempts (last 10)
  const recentAttempts = await db.exerciseAttempt.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { percentage: true, createdAt: true },
  });

  const avgMastery =
    subjectPerformance.length > 0
      ? Math.round(
          subjectPerformance.reduce((s, p) => s + p.masteryLevel, 0) /
            subjectPerformance.length
        )
      : 0;

  // Build concise data object for the LLM
  const llmData = {
    name: student.name,
    level: stats?.level ?? 1,
    avgMastery,
    weakTopics: weakTopics.slice(0, 5).map((w) => ({
      title: w.topicTitle,
      mastery: w.masteryLevel,
    })),
    subjectPerformance: subjectPerformance.map((p) => ({
      title: p.subjectTitle,
      mastery: p.masteryLevel,
      trend: p.trend,
    })),
    recentScores: recentAttempts
      .slice(0, 7)
      .map((a) => ({
        date: a.createdAt.toISOString().slice(0, 10),
        score: a.percentage,
      })),
  };

  // Generate the recommendation (LLM)
  const content = await generateRecommendation(llmData);

  // Determine priority
  const minWeakMastery =
    weakTopics.length > 0
      ? Math.min(...weakTopics.map((w) => w.masteryLevel))
      : 100;
  const priority =
    minWeakMastery < 25 ? "HIGH" : minWeakMastery < 50 ? "MEDIUM" : "LOW";

  // related subject/topic from first weak topic
  const firstWeak = weakTopics[0] ?? null;

  // Save Recommendation row
  const created = await db.recommendation.create({
    data: {
      studentId,
      type: "LEARNING",
      content,
      priority,
      relatedSubjectId: firstWeak?.subjectId ?? null,
      relatedTopicId: firstWeak?.topicId ?? null,
    },
  });

  const dto: RecommendationDTO = {
    id: created.id,
    type: created.type,
    content: created.content,
    priority: created.priority,
    relatedSubjectId: created.relatedSubjectId,
    relatedTopicId: created.relatedTopicId,
    createdAt: created.createdAt.toISOString(),
  };

  return Response.json(dto, { status: 201 });
}
