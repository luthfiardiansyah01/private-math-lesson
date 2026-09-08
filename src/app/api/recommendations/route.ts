// Phase 3 Intelligence — Student's own recommendations
// GET /api/recommendations
// Auth: STUDENT only.
// Returns last 10 RecommendationDTO[] for the current user.

import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import type { RecommendationDTO } from "@/lib/analytics-types";

export async function GET() {
  const auth = await requireStudent();
  if ("error" in auth)
    return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const rows = await db.recommendation.findMany({
    where: { studentId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const dtos: RecommendationDTO[] = rows.map((r) => ({
    id: r.id,
    type: r.type,
    content: r.content,
    priority: r.priority,
    relatedSubjectId: r.relatedSubjectId,
    relatedTopicId: r.relatedTopicId,
    createdAt: r.createdAt.toISOString(),
  }));

  return Response.json(dtos);
}
