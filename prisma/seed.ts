/**
 * Seed script — hanya membuat akun demo (tutor + siswa).
 * Seluruh konten (mata pelajaran, topik, pelajaran, latihan, soal)
 * diinput oleh tutor melalui aplikasi.
 *
 * Usage:
 *   bun prisma/seed.ts
 *   (atau `bun run db:seed`)
 */

import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("🧹 Membersihkan database...");

  await db.$transaction([
    db.exerciseAttempt.deleteMany(),
    db.mastery.deleteMany(),
    db.progress.deleteMany(),
    db.learningSession.deleteMany(),
    db.lessonAttachment.deleteMany(),
    db.question.deleteMany(),
    db.exercise.deleteMany(),
    db.lesson.deleteMany(),
    db.topic.deleteMany(),
    db.subject.deleteMany(),
    db.profile.deleteMany(),
    db.user.deleteMany(),
  ]);

  console.log("   ✓ Semua tabel dibersihkan");

  console.log("👤 Membuat akun demo...");

  const tutor = await db.user.create({
    data: {
      email: "tutor@hikari.id",
      name: "Tutor Demo",
      role: "TUTOR",
      appVersion: "TEENS",
      passwordHash: hashPassword("tutor123"),
    },
  });

  const student = await db.user.create({
    data: {
      email: "student@hikari.id",
      name: "Siswa Demo",
      role: "STUDENT",
      appVersion: "TEENS",
      grade: "IX",
      passwordHash: hashPassword("student123"),
    },
  });

  await db.profile.create({
    data: {
      userId: student.id,
      educationLevel: "SMA",
    },
  });

  console.log(`   ✓ Tutor: tutor@hikari.id / tutor123`);
  console.log(`   ✓ Siswa: student@hikari.id / student123`);
  console.log("✅ Seed selesai — silakan login sebagai tutor dan mulai buat konten.");
}

main()
  .catch((e) => {
    console.error("❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
