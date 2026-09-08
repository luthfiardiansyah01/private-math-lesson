"use client";

// Game History View — list of all game sessions with filter tabs.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  Brain,
  Zap,
  Puzzle as PuzzleIcon,
  Sword,
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
} from "lucide-react";
import { api } from "@/lib/api";
import { useNav } from "@/lib/store";
import { PageHeader, LoadingGrid, ErrorState, EmptyState } from "@/components/shared/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDuration, formatRelative } from "@/lib/ui";
import type { GameType, GameSessionDTO } from "@/lib/game-types";

// Filter tab values — Semua + one per GameType
const TABS: { value: string; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "QUIZ", label: "Quiz" },
  { value: "MATH_RUSH", label: "Math Rush" },
  { value: "MATH_PUZZLE", label: "Math Puzzle" },
  { value: "BOSS_CHALLENGE", label: "Boss Challenge" },
];

// Per-GameType display config
const GAME_TYPE_META: Record<
  GameType,
  { icon: typeof Brain; label: string; color: string }
> = {
  QUIZ: { icon: Brain, label: "Quiz", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  MATH_RUSH: { icon: Zap, label: "Math Rush", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  MATH_PUZZLE: { icon: PuzzleIcon, label: "Math Puzzle", color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  BOSS_CHALLENGE: { icon: Sword, label: "Boss", color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
};

export function GameHistoryView() {
  const [filter, setFilter] = useState<string>("ALL");
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["game-history"],
    queryFn: () => api.getGameHistory(),
  });
  const openGameHub = useNav((s) => s.openGameHub);

  if (isLoading) return <LoadingGrid count={4} />;
  if (isError) return <ErrorState message={error?.message ?? "Gagal memuat riwayat game"} />;
  if (!data) return null;

  const filtered =
    filter === "ALL" ? data : data.filter((g) => g.gameType === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Game"
        description="Semua aktivitas game kamu."
      />

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="overflow-x-auto w-full justify-start h-auto flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="Belum ada riwayat"
          description={
            filter === "ALL"
              ? "Mainkan game pertamamu untuk melihat riwayat di sini."
              : "Belum ada game di kategori ini."
          }
          action={
            <Button onClick={openGameHub}>
              <Trophy className="w-4 h-4" />
              Buka Game Hub
            </Button>
          }
        />
      ) : (
        <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1 -mr-1">
          {filtered.map((g) => (
            <HistoryRow key={g.id} session={g} />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryRow({ session: g }: { session: GameSessionDTO }) {
  const meta = GAME_TYPE_META[g.gameType];
  const Icon = meta.icon;
  const isCompleted = g.status === "COMPLETED";
  const md = g.metadata ?? {};

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
            <Icon className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{meta.label}</p>
                <Badge
                  className={
                    isCompleted
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-xs"
                  }
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Selesai
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" />
                      Gagal
                    </>
                  )}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatRelative(g.createdAt)}
              </span>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                <span className="font-semibold text-foreground">{g.score}</span> skor
              </span>
              <span>·</span>
              <span>
                Benar <span className="font-semibold text-foreground">{g.correctCount}/{g.totalCount}</span>
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(g.durationSec)}
              </span>
            </div>

            {/* XP earned + metadata */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                +{g.xpEarned} XP
              </Badge>
              {md.bossName && (
                <Badge variant="outline" className="text-xs">
                  Boss: {md.bossName}
                  {md.bossDefeated && " ✓"}
                </Badge>
              )}
              {md.subjectTitle && (
                <Badge variant="outline" className="text-xs">
                  {md.subjectTitle}
                </Badge>
              )}
              {md.difficulty && (
                <Badge variant="outline" className="text-xs">
                  {md.difficulty}
                </Badge>
              )}
              {md.maxStreak != null && md.maxStreak > 0 && (
                <Badge variant="outline" className="text-xs">
                  Streak {md.maxStreak}
                </Badge>
              )}
              {md.studentHpLeft != null && g.gameType === "BOSS_CHALLENGE" && (
                <Badge variant="outline" className="text-xs">
                  HP tersisa {md.studentHpLeft}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default GameHistoryView;
