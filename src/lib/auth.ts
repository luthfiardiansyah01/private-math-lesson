import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "STUDENT" | "TUTOR" | "PARENT";
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const u = session.user as any;
  if (!u.id || !u.role) return null;
  return {
    id: u.id,
    email: u.email!,
    name: u.name!,
    role: u.role,
  };
}

export async function requireStudent() {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };
  if (user.role !== "STUDENT")
    return { error: "Forbidden: student only", status: 403 as const };
  return { user };
}

export async function requireTutor() {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };
  if (user.role !== "TUTOR")
    return { error: "Forbidden: tutor only", status: 403 as const };
  return { user };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };
  return { user };
}

// Ensure a profile exists for the user, create if missing
export async function ensureProfile(userId: string) {
  let profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await db.profile.create({ data: { userId } });
  }
  return profile;
}
