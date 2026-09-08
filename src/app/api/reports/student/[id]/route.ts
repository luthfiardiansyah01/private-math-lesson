// Phase 3 Intelligence — Weekly/Monthly Report data
// GET /api/reports/student/[id]?period=weekly|monthly
// Auth: TUTOR (any), STUDENT (self), PARENT (linked child).
// Returns ReportDTO via buildReportData().

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { buildReportData } from "@/lib/analytics-engine";
import type { ReportDTO } from "@/lib/analytics-types";

async function canViewStudent(
  viewer: { id: string; role: "STUDENT" | "TUTOR" | "PARENT" },
  studentId: string
): Promise<boolean> {
  if (viewer.role === "TUTOR") return true;
  if (viewer.role === "STUDENT") return viewer.id === studentId;
  const link = await db.parentLink.findUnique({
    where: { parentId_studentId: { parentId: viewer.id, studentId } },
  });
  return !!link;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth)
    return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { id: studentId } = await params;

  const allowed = await canViewStudent(user, studentId);
  if (!allowed)
    return Response.json(
      { error: "Forbidden: cannot view this student" },
      { status: 403 }
    );

  const { searchParams } = new URL(req.url);
  const periodParam = searchParams.get("period")?.toLowerCase();
  const period = periodParam === "monthly" ? "MONTHLY" : "WEEKLY";

  // Verify student exists
  const student = await db.user.findUnique({
    where: { id: studentId },
    select: { id: true, role: true },
  });
  if (!student)
    return Response.json({ error: "Student not found" }, { status: 404 });
  if (student.role !== "STUDENT")
    return Response.json(
      { error: "Target user is not a student" },
      { status: 400 }
    );

  try {
    const data = await buildReportData(studentId, period);
    const dto: ReportDTO = {
      student: data.student,
      profile: data.profile,
      period: data.period,
      stats: data.stats,
      subjectPerformance: data.subjectPerformance.map((p) => ({
        subjectId: p.subjectId,
        subjectTitle: p.subjectTitle,
        subjectColor: p.subjectColor,
        masteryLevel: p.masteryLevel,
        lessonsCompleted: p.lessonsCompleted,
        lessonsTotal: p.lessonsTotal,
        avgExerciseScore: p.avgExerciseScore,
        exerciseAttempts: p.exerciseAttempts,
        gameSessionsCount: p.gameSessionsCount,
        avgGameScore: p.avgGameScore,
        timeSpentSec: p.timeSpentSec,
        trend: p.trend,
        trendDelta: p.trendDelta,
        recentScores: p.recentScores,
      })),
      weakTopics: data.weakTopics.map((w) => ({
        topicId: w.topicId,
        topicTitle: w.topicTitle,
        subjectId: w.subjectId,
        subjectTitle: w.subjectTitle,
        subjectColor: w.subjectColor,
        masteryLevel: w.masteryLevel,
        lessonsCompleted: w.lessonsCompleted,
        lessonsTotal: w.lessonsTotal,
        avgExerciseScore: w.avgExerciseScore,
        severity: w.severity,
        gap: w.gap,
      })),
      recentActivity: data.recentActivity,
      recommendations: data.recommendations.map((r) => ({
        id: r.id,
        type: r.type,
        content: r.content,
        priority: r.priority,
        relatedSubjectId: null,
        relatedTopicId: null,
        createdAt: r.createdAt,
      })),
      achievementsUnlocked: data.achievementsUnlocked,
      summary: data.summary,
    };
    return Response.json(dto);
  } catch (e: any) {
    console.error("[reports/student] error:", e);
    return Response.json(
      { error: e?.message ?? "Failed to build report" },
      { status: 500 }
    );
  }
}
