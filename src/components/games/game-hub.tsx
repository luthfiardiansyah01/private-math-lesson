"use client";

// Game Hub — central landing page for all gamification features.
// Renders the player's XP/level hero card, 4 game cards, boss list, leaderboard, recent achievements.

import { useQuery } from "@tanstack/react-query";
import {
  Flame,
  Brain,
  Zap,
  Puzzle,
  Sword,
  Trophy,
  Crown,
  CheckCircle2,
  ChevronRight,
  Star,
  History,
  Award,
} from "lucide-react";
import { api } from "@/lib/api";
import { useNav } from "@/lib/store";
import { PageHeader, LoadingGrid, ErrorState, EmptyState } from "@/components/shared/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { bossIcon, gameAchievementIcon } from "./game-icons";
import { colorClasses, formatRelative } from "@/lib/ui";
import type { GameType } from "@/lib/game-types";

// Game card display config (matches the API metadata for `games[]`).
const GAME_META: Record<
  GameType,
  { icon: typeof Brain; color: string; view: "gameQuiz" | "gameMathRush" | "gameMathPuzzle" | "gameBoss" }
> = {
  QUIZ: { icon: Brain, color: "emerald", view: "gameQuiz" },
  MATH_RUSH: { icon: Zap, color: "amber", view: "gameMathRush" },
  MATH_PUZZLE: { icon: Puzzle, color: "violet", view: "gameMathPuzzle" },
  BOSS_CHALLENGE: { icon: Sword, color: "rose", view: "gameBoss" },
};

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: "Mudah",
  MEDIUM: "Sedang",
  HARD: "Sulit",
};

export function GameHub() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["game-hub"],
    queryFn: () => api.getGameHub(),
  });

  const openGame = useNav((s) => s.openGame);
  const openBoss = useNav((s) => s.openBoss);
  const openAchievements = useNav((s) => s.openAchievements);
  const openGameHistory = useNav((s) => s.openGameHistory);

  if (isLoading) return <LoadingGrid count={4} />;
  if (isError) return <ErrorState message={error?.message ?? "Gagal memuat Game Hub"} />;
  if (!data) return null;

  const { stats, games, bosses, recentAchievements, leaderboard } = data;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Game Hub"
        description="Belajar sambil bermain! Pilih game favoritmu."
        action={
          <Button
            variant="outline"
            onClick={openGameHistory}
            className="hidden sm:inline-flex"
          >
            <History className="w-4 h-4" />
            Riwayat Game
          </Button>
        }
      />

      {/* Hero XP card */}
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-emerald-50/30 to-teal-50/30 dark:via-emerald-950/20 dark:to-teal-950/20">
        <CardContent className="p-5 sm:p-7">
          <div className="grid sm:grid-cols-[auto_1fr] gap-5 sm:gap-7 items-center">
            {/* Level circle */}
            <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:justify-center sm:gap-2">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                <div className="text-center leading-none">
                  <p className="text-[10px] uppercase tracking-wide opacity-80">Level</p>
                  <p className="text-3xl sm:text-4xl font-bold tabular-nums">{stats.level}</p>
                </div>
              </div>
              <div className="sm:text-center">
                <p className="text-xs text-muted-foreground">Total XP</p>
                <p className="text-xl font-bold tabular-nums">{stats.totalXP}</p>
              </div>
            </div>

            {/* XP progress + streak */}
            <div className="space-y-4 min-w-0">
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium">Progress Level</span>
                  <span className="text-muted-foreground tabular-nums">
                    {stats.xpIntoLevel} / {stats.xpForNextLevel} XP
                  </span>
                </div>
                <Progress value={stats.levelProgressPct} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {stats.xpForNextLevel - stats.xpIntoLevel} XP lagi menuju Level {stats.level + 1}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    stats.currentStreak > 0
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  <Flame className="w-3.5 h-3.5" />
                  {stats.currentStreak} hari streak{stats.currentStreak > 0 ? " 🔥" : ""}
                </Badge>
                <Badge variant="outline">
                  <Trophy className="w-3.5 h-3.5" />
                  {stats.gamesPlayed} game
                </Badge>
                <Badge variant="outline">
                  <Sword className="w-3.5 h-3.5" />
                  {stats.bossesDefeated} boss
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game cards grid */}
      <div>
        <h2 className="font-semibold text-lg mb-3">Pilih Game</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {games.map((g) => {
            const meta = GAME_META[g.type];
            const Icon = meta.icon;
            const c = colorClasses(g.color);
            return (
              <button
                key={g.type}
                type="button"
                onClick={() => openGame(meta.view)}
                className={`group text-left rounded-xl border ${c.border} ${c.bg} p-5 transition-all hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${c.dot} text-white flex items-center justify-center shrink-0 shadow-sm`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-base">{g.title}</h3>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className={`text-sm ${c.text} mt-0.5`}>{g.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3.5 h-3.5" />
                        Skor terbaik: <span className="font-semibold text-foreground">{g.bestScore}</span>
                      </span>
                      <span>·</span>
                      <span>{g.playsCount}× main</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Boss list */}
      {bosses.length > 0 && (
        <div>
          <h2 className="font-semibold text-lg mb-3">Boss Challenge</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bosses.map((b) => {
              const Icon = bossIcon(b.icon);
              const c = colorClasses(b.color);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => openBoss(b.id)}
                  className={`group text-left rounded-xl border ${c.border} bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-lg ${c.bg} ${c.text} flex items-center justify-center shrink-0`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold truncate">{b.name}</h3>
                        {b.defeated && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {DIFFICULTY_LABEL[b.difficulty] ?? b.difficulty}
                        </Badge>
                        <span className="text-xs text-muted-foreground">HP {b.hp}</span>
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                          +{b.rewardXP} XP
                        </Badge>
                      </div>
                      {b.defeated && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                          ✓ Telah dikalahkan
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Leaderboard + Recent achievements */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              Papan Peringkat
            </CardTitle>
            <CardDescription>Top 5 siswa berdasarkan XP</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Belum ada data peringkat.
              </p>
            ) : (
              <ol className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <li
                    key={entry.studentId}
                    className={`flex items-center gap-3 rounded-lg p-2.5 ${
                      i === 0
                        ? "bg-amber-50 dark:bg-amber-950/30"
                        : i === 1
                        ? "bg-zinc-50 dark:bg-zinc-900/30"
                        : i === 2
                        ? "bg-orange-50 dark:bg-orange-950/30"
                        : ""
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        i === 0
                          ? "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-100"
                          : i === 1
                          ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100"
                          : i === 2
                          ? "bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-100"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{entry.name}</p>
                      <p className="text-xs text-muted-foreground">Level {entry.level}</p>
                    </div>
                    <span className="font-bold tabular-nums text-sm">{entry.totalXP} XP</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  Lencana Terbaru
                </CardTitle>
                <CardDescription>Prestasi yang baru terbuka</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={openAchievements}>
                Lihat Semua
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentAchievements.length === 0 ? (
              <EmptyState
                icon={Award}
                title="Belum ada lencana"
                description="Mainkan game untuk membuka prestasi pertamamu."
                action={
                  <Button size="sm" variant="outline" onClick={openAchievements}>
                    Lihat Semua Achievement
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-2">
                {recentAchievements.map((a) => {
                  const Icon = gameAchievementIcon(a.icon);
                  return (
                    <li
                      key={a.code}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.unlockedAt ? formatRelative(a.unlockedAt) : ""}
                        </p>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                        +{a.xpReward} XP
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default GameHub;
