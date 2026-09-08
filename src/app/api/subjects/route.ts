import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireTutor } from "@/lib/auth";

interface SubjectListItem {
  id: string;
  title: string;
  description: string | null;
  color: string;
  icon: string;
  tutorId: string;
  tutorName: string;
  topicsCount: number;
  lessonsTotal: number;
}

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const where = user.role === "TUTOR" ? { tutorId: user.id } : undefined;

  const subjects = await db.subject.findMany({
    where,
    include: {
      tutor: { select: { name: true } },
      topics: { include: { lessons: { select: { id: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const result: SubjectListItem[] = subjects.map((s) => {
    const lessonsTotal = s.topics.reduce((sum, t) => sum + t.lessons.length, 0);
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      color: s.color,
      icon: s.icon,
      tutorId: s.tutorId,
      tutorName: s.tutor.name,
      topicsCount: s.topics.length,
      lessonsTotal,
    };
  });

  return Response.json(result);
}

export async function POST(req: NextRequest) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  try {
    const body = await req.json();
    const { title, description, color, icon } = body ?? {};

    if (!title || typeof title !== "string") {
      return Response.json({ error: "Title is required" }, { status: 400 });
    }

    const subject = await db.subject.create({
      data: {
        title: title.trim(),
        description: typeof description === "string" ? description : null,
        color: typeof color === "string" && color ? color : "emerald",
        icon: typeof icon === "string" && icon ? icon : "BookOpen",
        tutorId: user.id,
      },
      include: {
        tutor: { select: { name: true } },
        topics: { include: { lessons: { select: { id: true } } } },
      },
    });

    return Response.json(
      {
        id: subject.id,
        title: subject.title,
        description: subject.description,
        color: subject.color,
        icon: subject.icon,
        tutorId: subject.tutorId,
        tutorName: subject.tutor.name,
        topicsCount: subject.topics.length,
        lessonsTotal: subject.topics.reduce((s, t) => s + t.lessons.length, 0),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[subjects/POST] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
