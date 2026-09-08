"use client";

// Achievements View — full catalog with progress bars, filters, unlock status.

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Lock, CheckCircle2, Sparkles, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { useNav } from "@/lib/store";
import { PageHeader, LoadingGrid, ErrorState, EmptyState } from "@/components/shared/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gameAchievementIcon } from "./game-icons";
import { formatRelative } from "@/lib/ui";
import type { AchievementDTO } from "@/lib/game-types";

// Map API category codes → Indonesian tab labels
const CATEGORY_LABEL: Record<string, string> = {
  GENERAL: "Umum",
  QUIZ: "Kuis",
  RUSH: "Rush",
  PUZZLE: "Puzzle",
  BOSS: "Boss",
  STREAK: "Streak",
  LEVEL: "Level",
};

const TAB_VALUES = ["ALL", "GENERAL", "QUIZ", "RUSH", "PUZZLE", "BOSS", "STREAK", "LEVEL"];

export function AchievementsView() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["achievements"],
    queryFn: () => api.getAchievements(),
  });
  const openGameHub = useNav((s) => s.openGameHub);
  const [filter, setFilter] = useState<string>("ALL");

  if (isLoading) return <LoadingGrid count={6} />;
  if (isError) return <ErrorState message={error?.message ?? "Gagal memuat achievement"} />;
  if (!data) return null;

  const filtered =
    filter === "ALL" ? data : data.filter((a) => a.category === filter);

  const unlockedCount = data.filter((a) => a.unlocked).length;
  const totalXpFromRewards = data
    .filter((a) => a.unlocked)
    .reduce((s, a) => s + a.xpReward, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Achievement"
        description="Kumpulkan semua lencana prestasi!"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Terbuka</p>
              <p className="text-2xl font-bold tabular-nums">
                {unlockedCount}<span className="text-base text-muted-foreground">/{data.length}</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">XP dari Achievement</p>
              <p className="text-2xl font-bold tabular-nums">{totalXpFromRewards}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold tabular-nums">
                {data.length > 0 ? Math.round((unlockedCount / data.length) * 100) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="overflow-x-auto w-full justify-start h-auto flex-wrap">
          {TAB_VALUES.map((v) => (
            <TabsTrigger key={v} value={v} className="text-xs sm:text-sm">
              {v === "ALL" ? "Semua" : CATEGORY_LABEL[v] ?? v}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Achievement cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Tidak ada achievement"
          description="Belum ada achievement di kategori ini."
          action={
            <Button variant="outline" onClick={openGameHub}>
              Main Game
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <AchievementCard key={a.code} achievement={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function AchievementCard({ achievement: a }: { achievement: AchievementDTO }) {
  const progressPct =
    a.threshold > 0 ? Math.min(100, Math.round((a.progress / a.threshold) * 100)) : 0;

  return (
    <Card
      className={
        a.unlocked
          ? "border-primary/30"
          : "opacity-90 border-dashed"
      }
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
              a.unlocked
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {a.unlocked
              ? React.createElement(gameAchievementIcon(a.icon), { className: "w-6 h-6" })
              : <Lock className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{a.title}</h3>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs shrink-0">
                +{a.xpReward} XP
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>

            {/* Status / progress */}
            <div className="mt-3">
              {a.unlocked ? (
                <div className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Terbuka {a.unlockedAt ? `· ${formatRelative(a.unlockedAt)}` : ""}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {a.progress} / {a.threshold}
                    </span>
                    <span>{progressPct}%</span>
                  </div>
                  <Progress value={progressPct} className="h-1.5" />
                </div>
              )}
            </div>

            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {CATEGORY_LABEL[a.category] ?? a.category}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AchievementsView;
