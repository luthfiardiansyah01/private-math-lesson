import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";

export async function GET() {
  const auth = await requireStudent();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const rows = await db.progress.findMany({
    where: { studentId: user.id },
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          topic: {
            select: {
              id: true,
              title: true,
              subject: { select: { id: true, title: true, color: true } },
            },
          },
        },
      },
    },
    orderBy: { lastAccessedAt: "desc" },
  });

  const result = rows.map((p) => ({
    lessonId: p.lessonId,
    lessonTitle: p.lesson?.title ?? "",
    topicTitle: p.lesson?.topic?.title ?? "",
    subjectTitle: p.lesson?.topic?.subject?.title ?? "",
    subjectColor: p.lesson?.topic?.subject?.color ?? "",
    status: p.status as any,
    completionPct: p.completionPct,
    timeSpentSec: p.timeSpentSec,
    lastAccessedAt: p.lastAccessedAt ? p.lastAccessedAt.toISOString() : null,
  }));

  return Response.json(result);
}
