import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const VALID_ROLES = new Set(["STUDENT", "TUTOR", "PARENT"]);
const VALID_VERSIONS = new Set(["KIDS", "TEENS", "ADULTS"]);
const VALID_GRADES = new Set(["VII", "VIII", "IX", "X", "XI", "XII"]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, role, appVersion, grade } = body ?? {};

    if (!name || !email || !password || !role) {
      return Response.json(
        { ok: false, error: "Missing required fields: name, email, password, role" },
        { status: 400 }
      );
    }

    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
      return Response.json(
        { ok: false, error: "Invalid field types" },
        { status: 400 }
      );
    }

    if (!VALID_ROLES.has(role)) {
      return Response.json(
        { ok: false, error: "Invalid role. Must be STUDENT, TUTOR, or PARENT" },
        { status: 400 }
      );
    }

    const resolvedVersion = appVersion && VALID_VERSIONS.has(appVersion) ? appVersion : "TEENS";
    const resolvedGrade = grade && VALID_GRADES.has(grade) ? grade : null;

    if (password.length < 6) {
      return Response.json(
        { ok: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return Response.json(
        { ok: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role,
        appVersion: resolvedVersion,
        grade: resolvedGrade,
      },
    });

    // Students get an empty profile by default for profile completion later.
    if (role === "STUDENT") {
      await db.profile.create({
        data: { userId: user.id },
      });
    }

    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[auth/register] error:", err);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
