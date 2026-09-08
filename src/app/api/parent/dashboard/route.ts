// Phase 3 Intelligence — Parent Dashboard
// GET /api/parent/dashboard
// Auth: role PARENT only.
// Returns ParentDashboardDTO.

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  analyzeStudentPerformance,
  detectWeakTopics,
} from "@/lib/analytics-engine";
import type { ParentDashboardDTO } from "@/lib/analytics-types";

function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth)
    return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  if (user.role !== "PARENT")
    return Response.json(
      { error: "Forbidden: parent role only" },
      { status: 403 }
    );

  // All children links
  const links = await db.parentLink.findMany({
    where: { parentId: user.id },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const children: ParentDashboardDTO["children"] = [];
  for (const link of links) {
    const sid = link.student.id;

    // stats
    const stats = await db.studentStats.findUnique({
      where: { studentId: sid },
    });
    const level = stats?.level ?? 1;
    const totalXP = stats?.totalXP ?? 0;
    const currentStreak = stats?.currentStreak ?? 0;

    // avgMastery (avg of Mastery.level across subjects — all mastery rows for the student)
    const masteryAgg = await db.mastery.aggregate({
      where: { studentId: sid },
      _avg: { level: true },
    });
    const avgMastery = masteryAgg._avg.level
      ? Math.round(masteryAgg._avg.level)
      : 0;

    // lessonsCompleted / Total across all subjects (from subject-level mastery rows; fallback to progress rows)
    const subjectLevelMastery = await db.mastery.findMany({
      where: { studentId: sid, topicId: null },
      select: { lessonsCompleted: true, lessonsTotal: true },
    });
    let lessonsCompleted = 0;
    let lessonsTotal = 0;
    if (subjectLevelMastery.length > 0) {
      for (const m of subjectLevelMastery) {
        lessonsCompleted += m.lessonsCompleted;
        lessonsTotal += m.lessonsTotal;
      }
    } else {
      const progress = await db.progress.findMany({
        where: { studentId: sid },
        select: { status: true },
      });
      lessonsCompleted = progress.filter(
        (p) => p.status === "COMPLETED"
      ).length;
      lessonsTotal = await db.lesson.count();
    }

    // weakTopicCount + topWeakTopic (across all subjects)
    let weakTopicCount = 0;
    let topWeakTopic: string | null = null;
    try {
      const weak = await detectWeakTopics(sid);
      weakTopicCount = weak.filter(
        (w) => w.severity === "CRITICAL" || w.severity === "WEAK"
      ).length;
      topWeakTopic = weak.length > 0 ? weak[0].topicTitle : null;
    } catch {
      // keep defaults
    }

    // trend (dominant from analyzeStudentPerformance — use first subject's trend)
    let trend: ParentDashboardDTO["children"][number]["trend"] = "STABLE";
    try {
      const perf = await analyzeStudentPerformance(sid);
      if (perf.length > 0) trend = perf[0].trend;
    } catch {
      // keep STABLE
    }

    // lastActive (max Progress.lastAccessedAt)
    const lastProgress = await db.progress.findFirst({
      where: { studentId: sid, lastAccessedAt: { not: null } },
      orderBy: { lastAccessedAt: "desc" },
      select: { lastAccessedAt: true },
    });
    const lastActive = lastProgress?.lastAccessedAt
      ? lastProgress.lastAccessedAt.toISOString()
      : null;

    children.push({
      studentId: sid,
      name: link.student.name,
      avatarInitials: avatarInitials(link.student.name),
      relation: link.relation,
      level,
      totalXP,
      currentStreak,
      avgMastery,
      lessonsCompleted,
      lessonsTotal,
      weakTopicCount,
      topWeakTopic,
      trend,
      lastActive,
    });
  }

  const result: ParentDashboardDTO = {
    parent: { id: user.id, name: user.name, email: user.email },
    children,
  };

  return Response.json(result);
}
