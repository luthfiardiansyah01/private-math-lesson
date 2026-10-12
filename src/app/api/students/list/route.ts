import { db } from "@/lib/db";
import { requireTutor } from "@/lib/auth";

// GET /api/students/list — semua student yang pernah mengakses materi tutor ini
export async function GET() {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  // Ambil subjek tutor → ambil semua student yang punya progress di lesson-lesson tersebut
  const subjects = await db.subject.findMany({
    where: { tutorId: user.id },
    include: {
      topics: {
        include: {
          lessons: {
            include: {
              progress: {
                include: {
                  student: { select: { id: true, name: true, email: true, grade: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  // Deduplicate students
  const map = new Map<string, { id: string; name: string; email: string; grade: string | null }>();
  for (const subj of subjects) {
    for (const topic of subj.topics) {
      for (const lesson of topic.lessons) {
        for (const prog of lesson.progress) {
          map.set(prog.student.id, prog.student);
        }
      }
    }
  }

  return Response.json([...map.values()]);
}
