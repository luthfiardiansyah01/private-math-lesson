import { requireStudent } from "@/lib/auth";
import { getAchievementsForStudent } from "@/lib/game-engine";

// GET /api/achievements — all achievements with unlock status + progress for the current student
export async function GET() {
  const auth = await requireStudent();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const achievements = await getAchievementsForStudent(user.id);
  return Response.json(achievements);
}
