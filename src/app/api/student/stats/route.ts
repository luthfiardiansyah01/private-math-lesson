import { requireStudent } from "@/lib/auth";
import { ensureStats, toStatsDTO } from "@/lib/game-engine";

// GET /api/student/stats — current student's gamification stats
export async function GET() {
  const auth = await requireStudent();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const stats = await ensureStats(user.id);
  return Response.json(toStatsDTO(stats));
}
