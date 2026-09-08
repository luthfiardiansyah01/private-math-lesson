# Task ID 17 — backend-api agent

## Task
Build ALL the backend API routes for Phase 3 Intelligence & Reporting of the EduTrack LMS.

## Context
- Read `/home/z/my-project/worklog.md` for full context. Tasks 1–16 set up the foundation: schema, auth, Phase 1 (learning), Phase 2 (gamification), Phase 3 schema + analytics engine + shared types (Task 16).
- The Prisma schema for Phase 3 (MasteryHistory, Recommendation, ParentLink, PARENT role on User) was already pushed in Task 16.
- The analytics engine `@/lib/analytics-engine.ts` and shared types `@/lib/analytics-types.ts` were created in Task 16 and were the contract this task consumed unchanged.

## Work Log
- Extended auth layer to support PARENT role:
  - `src/lib/auth.ts` — `SessionUser.role` union now `"STUDENT" | "TUTOR" | "PARENT"`.
  - `src/types/next-auth.d.ts` — Session.user.role + JWT.role union updated to include `PARENT`.
  - `src/app/api/auth/register/route.ts` — `VALID_ROLES` set now includes `"PARENT"`; updated error message; PARENT users get no Profile (only STUDENT creates a Profile — preserved existing behavior).
- Created 7 new route files (8 endpoints — `parent/children` exposes GET + POST):

  1. `src/app/api/analytics/tutor/route.ts` — `GET /api/analytics/tutor`
     - `requireTutor`. Returns `TutorAnalyticsDTO` with `overview`, `students[]`, `subjectOverview[]`.
     - Efficient single-pass query pattern: pulls all tutor subjects → lessons → exercises → progress rows → mastery rows (filtered to subjectIds + studentIds) → exercise attempts (filtered to tutor exercise ids + student ids) → game sessions (all for those students) in 6 bulk queries, then aggregates in-memory per student.
     - Per student: avatarInitials, level/totalXP/currentStreak (StudentStats), avgMastery (topic-level mastery avg), lessonsCompleted/Total (subject-level mastery sums, fallback to progress rows), exercisesTaken + avgExerciseScore, gamesPlayed, weakTopicCount + topWeakTopic (via `detectWeakTopics`), trend (first subject's trend from `analyzeStudentPerformance`), lastActive (max Progress.lastAccessedAt).
     - Per subject: studentCount (distinct from progress), avgMastery (all mastery rows for the subject), weakTopicCount (rows with level < 50).
     - Overview: totalStudents/Subjects/Lessons, avgMasteryAcrossStudents (topic-level mastery avg across all student rows), activeStudentsThisWeek (lastAccessedAt within 7 days), totalExerciseAttempts, totalGameSessions.

  2. `src/app/api/analytics/student/[id]/route.ts` — `GET /api/analytics/student/[id]`
     - `requireAuth`, then authorization matrix: TUTOR → any student; STUDENT → own id only; PARENT → only linked child (ParentLink lookup).
     - Returns `StudentDetailAnalyticsDTO`. Builds: student + profile (incl. bio), stats (StudentStats), masteryBreakdown (aggregated subject-level mastery + game avg, fed into `computeWeightedMastery`), subjectPerformance (`analyzeStudentPerformance`), weakTopics (`detectWeakTopics`), trends (for each subject: snapshot today then `getMasteryTrend` for 30 days — only subjects with mastery rows or trend history are included), recentActivity (merge last 10 ExerciseAttempt + last 10 GameSession, sorted desc, sliced to 15), recommendations (last 5 Recommendation rows), recentGames (last 5 GameSession as GameSessionDTO with parsed metadata), achievementsUnlocked (StudentAchievement count).

  3. `src/app/api/analytics/student/[id]/recommendations/route.ts` — `POST .../recommendations`
     - `requireAuth`. Authorization: TUTOR (any student) OR STUDENT (self only).
     - Gathers LLM context: name, level, avgMastery, top-5 weak topics (title + mastery), subject performance (title + mastery + trend), last 7 exercise scores.
     - Calls `ZAI.create()` → `zai.chat.completions.create({ messages, thinking: { type: "disabled" } })` with Indonesian tutor-AI system prompt + markdown-formatted 3–5 recommendation request.
     - On LLM failure, falls back to a static Indonesian message ("Rekomendasi sedang tidak tersedia…").
     - Priority logic: HIGH if any weak topic mastery < 25, MEDIUM if < 50, LOW otherwise.
     - Saves a `Recommendation` row (type "LEARNING", relatedSubjectId/topicId from first weak topic if any).
     - Returns `RecommendationDTO` with status 201.

  4. `src/app/api/reports/student/[id]/route.ts` — `GET /api/reports/student/[id]?period=weekly|monthly`
     - Same auth matrix as #2 (TUTOR any / STUDENT self / PARENT linked).
     - Defaults to WEEKLY; "monthly" → MONTHLY.
     - Calls `buildReportData(studentId, period)` and maps the result to `ReportDTO` (recommendations extended with relatedSubjectId/relatedTopicId set to null because the engine's ReportData shape doesn't include them — kept DTO-shape consistent).

  5. `src/app/api/parent/dashboard/route.ts` — `GET /api/parent/dashboard`
     - `requireAuth` + role check PARENT.
     - Fetches all ParentLink rows for this parent with student info.
     - Per child: level/totalXP/currentStreak (StudentStats), avgMastery (all mastery rows avg), lessonsCompleted/Total (subject-level mastery sums, fallback to progress rows), weakTopicCount + topWeakTopic (`detectWeakTopics`), trend (first subject from `analyzeStudentPerformance`), lastActive (max Progress.lastAccessedAt).
     - Returns `ParentDashboardDTO`.

  6. `src/app/api/parent/children/route.ts` — `GET` + `POST /api/parent/children`
     - GET: `requireAuth` + PARENT. Returns list of ParentLink rows with student info (id, name, email, createdAt).
     - POST: `requireAuth` + PARENT. Body `{ studentEmail, relation? }`. Looks up student by email; validates role STUDENT; rejects self-link; rejects duplicates (409); creates ParentLink with relation defaulting to "Orang Tua". Returns 201 with the created link + student summary.
     - Error handling: missing email (400), student not found (404), not a student (400), already linked (409), invalid JSON (400).

  7. `src/app/api/recommendations/route.ts` — `GET /api/recommendations`
     - `requireStudent`. Returns last 10 `RecommendationDTO[]` for the current user.

- Route #5 (PDF endpoint) was intentionally SKIPPED per the task spec — the frontend will render a print-optimized view and call `window.print()` directly on the JSON report data.

## Verification
- `bun run lint` — passes clean (zero errors, zero warnings).
- `curl http://localhost:3000/api/analytics/tutor` → 401 (auth gate works)
- `curl http://localhost:3000/api/parent/dashboard` → 401
- `curl http://localhost:3000/api/parent/children` → 401
- `curl http://localhost:3000/api/recommendations` → 401
- `curl http://localhost:3000/api/analytics/student/abc123` → 401
- `curl http://localhost:3000/api/reports/student/abc123?period=weekly` → 401
- `curl -X POST http://localhost:3000/api/analytics/student/abc123/recommendations` → 401
- `curl -X POST -d '{"name":"Test Parent","email":"test-parent@example.com","password":"password123","role":"PARENT"}' http://localhost:3000/api/auth/register` → `{"ok":true}` (PARENT role accepted)
- `dev.log` — no errors, no undefined Prisma model access (Task 16's `bun run db:push` already regenerated the client with masteryHistory, recommendation, parentLink).

## Files Created / Modified
- `src/lib/auth.ts` (MODIFIED — added PARENT to SessionUser role union)
- `src/types/next-auth.d.ts` (MODIFIED — added PARENT to Session + JWT role unions)
- `src/app/api/auth/register/route.ts` (MODIFIED — accept PARENT role, updated error message)
- `src/app/api/analytics/tutor/route.ts` (NEW)
- `src/app/api/analytics/student/[id]/route.ts` (NEW)
- `src/app/api/analytics/student/[id]/recommendations/route.ts` (NEW — uses z-ai-web-dev-sdk LLM)
- `src/app/api/reports/student/[id]/route.ts` (NEW)
- `src/app/api/parent/dashboard/route.ts` (NEW)
- `src/app/api/parent/children/route.ts` (NEW — GET + POST)
- `src/app/api/recommendations/route.ts` (NEW)

## Stage Summary
- All 8 Phase 3 Intelligence & Reporting endpoints are live and return proper auth-gated 401s for unauthenticated requests.
- LLM integration is wired (z-ai-web-dev-sdk server-side only, with graceful fallback).
- PARENT role is fully supported end-to-end (registration → dashboard → child linking).
- Frontend can now build: Advanced Tutor Analytics dashboard, Student Detail Analytics page, AI Recommendations panel, Weekly/Monthly Reports (with print), Parent Dashboard.
