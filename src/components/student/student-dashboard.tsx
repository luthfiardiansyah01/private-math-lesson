"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Clock,
  Brain,
  BookOpen,
  FileText,
  PenTool,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Flame,
  Trophy,
  Sword,
  Gamepad2,
  Award,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useNav } from "@/lib/store";
import {
  PageHeader,
  StatCard,
  LoadingGrid,
  EmptyState,
  ErrorState,
} from "@/components/shared/ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  colorClasses,
  formatDuration,
  formatRelative,
  statusLabel,
  statusBadgeClass,
} from "@/lib/ui";
import { gameAchievementIcon } from "@/components/games/game-icons";

export function StudentDashboard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: () => api.getStudentDashboard(),
  });

  // Gamification header — separate query, refreshed when games are submitted
  const { data: gamified, isLoading: gamifiedLoading } = useQuery({
    queryKey: ["gamified-dashboard"],
    queryFn: () => api.getGamifiedDashboard(),
  });

  const openLesson = useNav((s) => s.openLesson);
  const setView = useNav((s) => s.setView);
  const openGameHub = useNav((s) => s.openGameHub);
  const openAchievements = useNav((s) => s.openAchievements);

  if (isLoading) return <LoadingGrid count={4} />;
  if (isError) return <ErrorState message={error?.message ?? "Gagal memuat dashboard"} />;
  if (!data) return null;

  const { user, stats, continueLearning, recentActivity, masteryBySubject, weeklyActivity } = data;
  const weeklyHasData = weeklyActivity.some((d) => d.minutes > 0);

  const recentIcon = (type: string): LucideIcon =>
    type === "exercise" ? FileText : BookOpen;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Halo, ${user.name}! 👋`}
        description="Lanjutkan belajar dan capai targetmu."
        action={
          <Button
            variant="outline"
            onClick={() => setView("subjects")}
            className="hidden sm:inline-flex"
          >
            <Sparkles className="w-4 h-4" />
            Jelajahi Materi
          </Button>
        }
      />

      {/* Gamification header */}
      <GamificationHeader
        loading={gamifiedLoading}
        stats={gamified?.stats}
        recentBadges={gamified?.recentBadges ?? []}
        onOpenGameHub={openGameHub}
        onOpenAchievements={openAchievements}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="Materi Selesai"
          value={`${stats.lessonsCompleted}/${stats.lessonsTotal}`}
          sub="pelajaran"
          color="emerald"
        />
        <StatCard
          icon={Clock}
          label="Total Waktu Belajar"
          value={formatDuration(stats.totalTimeSpentSec)}
          sub="durasi"
          color="teal"
        />
        <StatCard
          icon={Brain}
          label="Rata-rata Mastery"
          value={`${Math.round(stats.avgMastery)}%`}
          sub="penguasaan"
          color="violet"
        />
        <StatCard
          icon={PenTool}
          label="Latihan Dikerjakan"
          value={stats.exercisesTaken}
          sub="latihan"
          color="orange"
        />
      </div>

      {/* Continue learning + Mastery */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Lanjutkan Belajar
            </CardTitle>
            <CardDescription>Lanjutkan pelajaran terakhir kamu</CardDescription>
          </CardHeader>
          <CardContent>
            {continueLearning.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Belum ada pelajaran"
                description="Mulai pelajaran pertamamu untuk melihatnya di sini."
                action={
                  <Button size="sm" onClick={() => setView("subjects")}>
                    Lihat Materi
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-2">
                {continueLearning.map((item) => {
                  const c = colorClasses(item.subjectColor);
                  return (
                    <li key={item.lessonId}>
                      <button
                        onClick={() => openLesson(item.lessonId)}
                        className="w-full text-left rounded-lg border p-4 hover:bg-accent/50 transition-colors flex items-center gap-4"
                      >
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">{item.lessonTitle}</p>
                            <Badge className={`shrink-0 ${statusBadgeClass(item.status)}`}>
                              {statusLabel(item.status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {item.subjectTitle} · {item.topicTitle}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Progress value={item.completionPct} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {item.completionPct}%
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              Mastery per Materi
            </CardTitle>
            <CardDescription>Level penguasaan kamu</CardDescription>
          </CardHeader>
          <CardContent>
            {masteryBySubject.length === 0 ? (
              <EmptyState
                icon={Brain}
                title="Belum ada data mastery"
                description="Mulai latihan untuk membangun mastery."
              />
            ) : (
              <ul className="space-y-4">
                {masteryBySubject.map((m) => {
                  const c = colorClasses(m.color);
                  return (
                    <li key={m.subjectId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                          <span className="text-sm font-medium truncate">
                            {m.subjectTitle}
                          </span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">
                          {Math.round(m.level)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full ${c.dot} transition-all`}
                          style={{ width: `${Math.min(100, Math.round(m.level))}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity + Weekly chart */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Aktivitas Terbaru
            </CardTitle>
            <CardDescription>Riwayat aktivitas belajar kamu</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="Belum ada aktivitas"
                description="Aktivitas belajar kamu akan muncul di sini."
              />
            ) : (
              <ul className="space-y-3">
                {recentActivity.map((a) => {
                  const Icon = recentIcon(a.type);
                  return (
                    <li key={a.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium truncate">{a.title}</p>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatRelative(a.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{a.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="w-4 h-4 text-primary" />
              Aktivitas Mingguan
            </CardTitle>
            <CardDescription>Menit belajar per hari</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyHasData ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyActivity} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.04)" }}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [`${v} menit`, "Belajar"]}
                    />
                    <Bar dataKey="minutes" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                Belum ada aktivitas minggu ini
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---- Gamification header (XP/level/streak/badges) ----
function GamificationHeader({
  loading,
  stats,
  recentBadges,
  onOpenGameHub,
  onOpenAchievements,
}: {
  loading: boolean;
  stats:
    | {
        level: number;
        totalXP: number;
        currentStreak: number;
        gamesPlayed: number;
        bossesDefeated: number;
        xpIntoLevel: number;
        xpForNextLevel: number;
        levelProgressPct: number;
      }
    | undefined;
  recentBadges: {
    code: string;
    title: string;
    icon: string;
    xpReward: number;
    unlockedAt: string | null;
  }[];
  onOpenGameHub: () => void;
  onOpenAchievements: () => void;
}) {
  if (loading || !stats) {
    // Render a small skeleton placeholder to avoid layout shift
    return (
      <Card className="border-primary/20">
        <CardContent className="p-5">
          <div className="h-24 animate-pulse rounded-md bg-muted/40" />
        </CardContent>
      </Card>
    );
  }

  const xpLeft = stats.xpForNextLevel - stats.xpIntoLevel;

  return (
    <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-emerald-50/30 to-teal-50/30 dark:via-emerald-950/20 dark:to-teal-950/20">
      <CardContent className="p-5 sm:p-6">
        <div className="grid lg:grid-cols-[auto_1fr_auto] gap-5 items-center">
          {/* Level circle */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md shrink-0">
              <div className="text-center leading-none">
                <p className="text-[9px] uppercase tracking-wide opacity-80">Level</p>
                <p className="text-2xl sm:text-3xl font-bold tabular-nums">{stats.level}</p>
              </div>
            </div>
            <div className="lg:hidden">
              <p className="text-xs text-muted-foreground">Total XP</p>
              <p className="text-xl font-bold tabular-nums">{stats.totalXP}</p>
            </div>
          </div>

          {/* XP progress + stat badges */}
          <div className="space-y-3 min-w-0">
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium">Progress Level {stats.level}</span>
                <span className="text-muted-foreground tabular-nums">
                  {stats.xpIntoLevel} / {stats.xpForNextLevel} XP
                </span>
              </div>
              <Progress value={stats.levelProgressPct} className="h-2.5" />
              <p className="text-xs text-muted-foreground mt-1.5">
                {xpLeft} XP lagi menuju Level {stats.level + 1}
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
                {stats.currentStreak} hari{stats.currentStreak > 0 ? " 🔥" : ""}
              </Badge>
              <Badge variant="outline">
                <Gamepad2 className="w-3.5 h-3.5" />
                {stats.gamesPlayed} game
              </Badge>
              <Badge variant="outline">
                <Sword className="w-3.5 h-3.5" />
                {stats.bossesDefeated} boss
              </Badge>
              <Badge variant="outline">
                <Trophy className="w-3.5 h-3.5" />
                {stats.totalXP} XP
              </Badge>
            </div>
          </div>

          {/* CTA */}
          <div className="lg:text-right">
            <Button onClick={onOpenGameHub} className="w-full lg:w-auto">
              <Gamepad2 className="w-4 h-4" />
              Main Game
            </Button>
          </div>
        </div>

        {/* Recent badges strip */}
        {recentBadges.length > 0 && (
          <div className="mt-5 pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                Lencana Terbaru
              </p>
              <Button variant="ghost" size="sm" onClick={onOpenAchievements} className="h-7 text-xs">
                Lihat Semua
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
              {recentBadges.slice(0, 4).map((b) => {
                const Icon = gameAchievementIcon(b.icon);
                return (
                  <div
                    key={b.code}
                    className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 shrink-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate max-w-28">{b.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {b.unlockedAt ? formatRelative(b.unlockedAt) : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StudentDashboard;
