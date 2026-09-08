# Task ID 13 — Backend API Routes for Phase 2 Gamification

Agent: backend-api

## Objective
Build all 11 API routes for Phase 2 Gamification under `src/app/api/`.

## Routes
1. POST `/api/games/submit`
2. GET `/api/student/stats`
3. GET `/api/achievements`
4. GET `/api/game-history` (with `?gameType=` filter)
5. GET `/api/game-hub`
6. GET `/api/games/math-rush` (gen arithmetic questions)
7. GET `/api/games/puzzles` (random from DB)
8. GET `/api/games/bosses`
9. GET `/api/games/bosses/[id]`
10. GET `/api/games/quiz` (build from Question table)
11. GET `/api/dashboard/student-gamified`

## Context I'm relying on
- Auth helper `requireStudent()` from `@/lib/auth` returns `{ user }` or `{ error, status }`.
- `@/lib/game-engine.ts` exports: `processGameSubmission`, `ensureStats`, `toStatsDTO`, `getAchievementsForStudent`, `levelForXP`, `levelProgress`.
- `@/lib/game-types.ts` exports all DTOs.
- DB client: `import { db } from "@/lib/db"`.
- All responses via `Response.json(...)`.
- JSON fields stored as JSON.stringify, read via JSON.parse with try/catch.

## Status
DONE. All 11 routes built. Lint passes clean. tsc passes clean (only pre-existing errors in examples/ and skills/ folders, none in our new routes). Smoke test: all routes return 401 without session (correct — `requireStudent` gating works); dev.log shows clean compilation for every route (no compile errors, no runtime errors).

## Files created
- `src/app/api/games/submit/route.ts` (74 lines)
- `src/app/api/student/stats/route.ts` (12 lines)
- `src/app/api/achievements/route.ts` (12 lines)
- `src/app/api/game-history/route.ts` (47 lines)
- `src/app/api/game-hub/route.ts` (133 lines)
- `src/app/api/games/math-rush/route.ts` (126 lines)
- `src/app/api/games/puzzles/route.ts` (40 lines)
- `src/app/api/games/bosses/route.ts` (44 lines)
- `src/app/api/games/bosses/[id]/route.ts` (45 lines)
- `src/app/api/games/quiz/route.ts` (78 lines)
- `src/app/api/dashboard/student-gamified/route.ts` (84 lines)

## Notes for next agent (frontend)
- All DTOs in `@/lib/game-types.ts` are matched exactly by the responses.
- `processGameSubmission` returns the full GameSubmitResult — frontend can show level-up / new-achievement toasts directly from the response.
- Math Rush: client gets `{ questions: MathRushQuestion[], durationSec: 60 }`. Each question already has the correct `answer` (frontend uses it to score; submit only the totals).
- Bosses: response includes `correctAnswer` per question so the frontend can check answers client-side during the fight.
- Quiz: response includes `correctAnswer` + `explanation` per question.
- Game Hub boss-defeated check uses string `includes` on metadata JSON — works for any session where `metadata.bossId` is set.

