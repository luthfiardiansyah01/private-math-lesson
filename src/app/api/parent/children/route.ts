// Phase 3 Intelligence — Manage parent-child links
// GET  /api/parent/children  → list current parent's children (ParentLink + student info)
// POST /api/parent/children  → link a new child by email { studentEmail, relation? }

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

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

  const links = await db.parentLink.findMany({
    where: { parentId: user.id },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const children = links.map((l) => ({
    id: l.id,
    studentId: l.studentId,
    parentId: l.parentId,
    relation: l.relation,
    student: {
      id: l.student.id,
      name: l.student.name,
      email: l.student.email,
      createdAt: l.student.createdAt.toISOString(),
    },
    createdAt: l.createdAt.toISOString(),
  }));

  return Response.json(children);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth)
    return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  if (user.role !== "PARENT")
    return Response.json(
      { error: "Forbidden: parent role only" },
      { status: 403 }
    );

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { studentEmail, relation } = body ?? {};
  if (typeof studentEmail !== "string" || !studentEmail.trim()) {
    return Response.json(
      { error: "Missing required field: studentEmail" },
      { status: 400 }
    );
  }

  const normalizedEmail = studentEmail.toLowerCase().trim();

  const student = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!student)
    return Response.json(
      { error: "Student not found with that email" },
      { status: 404 }
    );
  if (student.role !== "STUDENT")
    return Response.json(
      { error: "Target user is not a student" },
      { status: 400 }
    );
  if (student.id === user.id)
    return Response.json(
      { error: "Cannot link yourself as your own child" },
      { status: 400 }
    );

  // Check for existing link
  const existing = await db.parentLink.findUnique({
    where: { parentId_studentId: { parentId: user.id, studentId: student.id } },
  });
  if (existing)
    return Response.json(
      { error: "Already linked to this student" },
      { status: 409 }
    );

  const link = await db.parentLink.create({
    data: {
      parentId: user.id,
      studentId: student.id,
      relation:
        typeof relation === "string" && relation.trim()
          ? relation.trim()
          : "Orang Tua",
    },
  });

  return Response.json(
    {
      id: link.id,
      studentId: link.studentId,
      parentId: link.parentId,
      relation: link.relation,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
      },
      createdAt: link.createdAt.toISOString(),
    },
    { status: 201 }
  );
}
