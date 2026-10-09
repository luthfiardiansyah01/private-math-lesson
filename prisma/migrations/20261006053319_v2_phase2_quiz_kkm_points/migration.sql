-- CreateTable
CREATE TABLE "QuizCooldown" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "availableAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Exercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MCQ',
    "quizType" TEXT NOT NULL DEFAULT 'REGULAR',
    "kkm" INTEGER NOT NULL DEFAULT 75,
    "lessonId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Exercise_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Exercise" ("createdAt", "id", "lessonId", "title", "type", "updatedAt") SELECT "createdAt", "id", "lessonId", "title", "type", "updatedAt" FROM "Exercise";
DROP TABLE "Exercise";
ALTER TABLE "new_Exercise" RENAME TO "Exercise";
CREATE TABLE "new_ExerciseAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "percentage" INTEGER NOT NULL DEFAULT 0,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "routedTo" TEXT,
    "attemptNo" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExerciseAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExerciseAttempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ExerciseAttempt" ("answers", "createdAt", "exerciseId", "id", "passed", "percentage", "score", "studentId", "totalPoints") SELECT "answers", "createdAt", "exerciseId", "id", "passed", "percentage", "score", "studentId", "totalPoints" FROM "ExerciseAttempt";
DROP TABLE "ExerciseAttempt";
ALTER TABLE "new_ExerciseAttempt" RENAME TO "ExerciseAttempt";
CREATE INDEX "ExerciseAttempt_studentId_exerciseId_idx" ON "ExerciseAttempt"("studentId", "exerciseId");
CREATE TABLE "new_Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "options" TEXT,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 10,
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Question_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Question" ("correctAnswer", "exerciseId", "explanation", "id", "options", "order", "points", "text") SELECT "correctAnswer", "exerciseId", "explanation", "id", "options", "order", "points", "text" FROM "Question";
DROP TABLE "Question";
ALTER TABLE "new_Question" RENAME TO "Question";
CREATE TABLE "new_StudentStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TEXT,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "totalCorrect" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "bossesDefeated" INTEGER NOT NULL DEFAULT 0,
    "puzzlesSolved" INTEGER NOT NULL DEFAULT 0,
    "bestQuizScore" INTEGER NOT NULL DEFAULT 0,
    "bestMathRushScore" INTEGER NOT NULL DEFAULT 0,
    "bestMathPuzzleScore" INTEGER NOT NULL DEFAULT 0,
    "bestBossScore" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentStats_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StudentStats" ("bestBossScore", "bestMathPuzzleScore", "bestMathRushScore", "bestQuizScore", "bossesDefeated", "currentStreak", "gamesPlayed", "id", "lastActiveDate", "level", "longestStreak", "puzzlesSolved", "studentId", "totalCorrect", "totalQuestions", "totalXP", "updatedAt") SELECT "bestBossScore", "bestMathPuzzleScore", "bestMathRushScore", "bestQuizScore", "bossesDefeated", "currentStreak", "gamesPlayed", "id", "lastActiveDate", "level", "longestStreak", "puzzlesSolved", "studentId", "totalCorrect", "totalQuestions", "totalXP", "updatedAt" FROM "StudentStats";
DROP TABLE "StudentStats";
ALTER TABLE "new_StudentStats" RENAME TO "StudentStats";
CREATE UNIQUE INDEX "StudentStats_studentId_key" ON "StudentStats"("studentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "QuizCooldown_studentId_idx" ON "QuizCooldown"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizCooldown_studentId_exerciseId_key" ON "QuizCooldown"("studentId", "exerciseId");
