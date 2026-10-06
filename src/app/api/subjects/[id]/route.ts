import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireTutor } from "@/lib/auth";
import type { SubjectDTO } from "@/lib/types";

function mapSubject(s: any): SubjectDTO {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    color: s.color,
    icon: s.icon,
    tutorId: s.tutorId,
    tutorName: s.tutor?.name ?? "",
    topics: (s.topics ?? [])
      .slice()
      .sort((a: any, b: any) => a.order - b.order)
      .map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        order: t.order,
        subjectId: t.subjectId,
        lessons: (t.lessons ?? [])
          .slice()
          .sort((a: any, b: any) => a.order - b.order)
          .map((l: any) => ({
            id: l.id,
            title: l.title,
            content: l.content,
            summary: l.summary,
            durationMin: l.durationMin,
            order: l.order,
            topicId: l.topicId,
            attachments: (l.attachments ?? []).map((a: any) => ({
              id: a.id,
              lessonId: a.lessonId,
              filename: a.filename,
              storedName: a.storedName,
              mimeType: a.mimeType,
              sizeBytes: a.sizeBytes,
              createdAt: a.createdAt.toISOString(),
            })),
            exercises: (l.exercises ?? [])
              .slice()
              .sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime())
              .map((e: any) => ({
                id: e.id,
                title: e.title,
                type: e.type,
                lessonId: e.lessonId,
                questions: (e.questions ?? [])
                  .slice()
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((q: any) => ({
                    id: q.id,
                    text: q.text,
                    options: q.options ? safeParse(q.options) : null,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation,
                    points: q.points,
                    order: q.order,
                  })),
              })),
          })),
      })),
  };
}

function safeParse(s: string): string[] | null {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  const subject = await db.subject.findUnique({
    where: { id },
    include: {
      tutor: { select: { name: true } },
      topics: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              attachments: { orderBy: { createdAt: "asc" } },
              exercises: {
                include: {
                  questions: { orderBy: { order: "asc" } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!subject) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(mapSubject(subject));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { id } = await params;

  const existing = await db.subject.findUnique({ where: { id } });
  if (!existing || existing.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data: Record<string, string | null> = {};
    for (const k of ["title", "description", "color", "icon"]) {
      if (k in body) {
        const v = body[k];
        if (typeof v === "string" || v === null) data[k] = v;
      }
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await db.subject.update({
      where: { id },
      data,
      include: { tutor: { select: { name: true } } },
    });

    return Response.json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      color: updated.color,
      icon: updated.icon,
      tutorId: updated.tutorId,
      tutorName: updated.tutor.name,
    });
  } catch (err) {
    console.error("[subjects/PUT] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTutor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const { id } = await params;

  const existing = await db.subject.findUnique({ where: { id } });
  if (!existing || existing.tutorId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await db.subject.delete({ where: { id } });
  return Response.json({ ok: true });
}
