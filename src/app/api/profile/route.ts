import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, ensureProfile } from "@/lib/auth";
import type { ProfileDTO } from "@/lib/types";

function toDTO(p: {
  bio: string | null;
  avatarUrl: string | null;
  educationLevel: string | null;
  targetExam: string | null;
  studyGoals: string | null;
  phone: string | null;
}): ProfileDTO {
  return {
    bio: p.bio,
    avatarUrl: p.avatarUrl,
    educationLevel: p.educationLevel,
    targetExam: p.targetExam,
    studyGoals: p.studyGoals,
    phone: p.phone,
  };
}

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  const profile = await ensureProfile(user.id);
  return Response.json(toDTO(profile));
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  try {
    const body = await req.json();
    const allowed = ["bio", "avatarUrl", "educationLevel", "targetExam", "studyGoals", "phone"];
    const data: Record<string, string | null> = {};
    for (const key of allowed) {
      if (key in body) {
        const v = body[key];
        if (v === null || typeof v === "string") {
          data[key] = v;
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await db.profile.update({
      where: { userId: user.id },
      data,
    });

    return Response.json(toDTO(updated));
  } catch (err) {
    console.error("[profile/PUT] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
