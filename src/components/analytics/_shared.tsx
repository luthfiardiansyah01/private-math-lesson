"use client";

// Shared sub-components for Phase 3 analytics views (student detail + parent child detail).
// Kept here to avoid duplication between StudentDetailAnalytics and ParentChildDetail.

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  AlertTriangle,
  Flame,
  Sparkles,
  Clock,
  FileText,
  Gamepad2,
  BookOpen,
  Award,
  Zap,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import ReactMarkdown from "react-markdown";
import {
  colorClasses,
  formatDuration,
  formatRelative,
} from "@/lib/ui";
import type {
  MasteryBreakdownDTO,
  SubjectPerformanceDTO,
  WeakTopicDTO,
  RecommendationDTO,
  TrendPointDTO,
} from "@/lib/analytics-types";

// ---- Trend badge ----
type TrendType = "IMPROVING" | "DECLINING" | "STABLE" | "NEW";

export function TrendBadge({
  trend,
  delta,
}: {
  trend: TrendType;
  delta?: number;
}) {
  const deltaText =
    delta !== undefined && delta !== 0 ? ` ${delta > 0 ? "+" : ""}${Math.round(delta)}%` : "";
  switch (trend) {
    case "IMPROVING":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-100">
          <TrendingUp className="w-3 h-3 mr-1" />
          Naik{deltaText}
        </Badge>
      );
    case "DECLINING":
      return (
        <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-100">
          <TrendingDown className="w-3 h-3 mr-1" />
          Turun{deltaText}
        </Badge>
      );
    case "NEW":
      return (
        <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 hover:bg-sky-100">
          <Plus className="w-3 h-3 mr-1" />
          Baru
        </Badge>
      );
    case "STABLE":
    default:
      return (
        <Badge variant="secondary">
          <Minus className="w-3 h-3 mr-1" />
          Stabil{deltaText}
        </Badge>
      );
  }
}

// ---- Severity badge for weak topics ----
export function SeverityBadge({ severity }: { severity: "CRITICAL" | "WEAK" | "MODERATE" }) {
  switch (severity) {
    case "CRITICAL":
      return (
        <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-100">
          <AlertTriangle className="w-3 h-3 mr-1" /> Kritis
        </Badge>
      );
    case "WEAK":
      return (
        <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 hover:bg-orange-100">
          <AlertTriangle className="w-3 h-3 mr-1" /> Lemah
        </Badge>
      );
    case "MODERATE":
    default:
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 hover:bg-amber-100">
          <AlertTriangle className="w-3 h-3 mr-1" /> Sedang
        </Badge>
      );
  }
}

// ---- Priority badge for recommendations ----
export function PriorityBadge({ priority }: { priority: string }) {
  switch (priority) {
    case "HIGH":
      return (
        <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-100">
          Prioritas Tinggi
        </Badge>
      );
    case "MEDIUM":
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 hover:bg-amber-100">
          Prioritas Sedang
        </Badge>
      );
    case "LOW":
    default:
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-100">
          Prioritas Rendah
        </Badge>
      );
  }
}

// ---- Tiny sparkline (no axes, height 40) ----
export function Sparkline({
  data,
  color = "#10b981",
}: {
  data: { date: string; score: number }[];
  color?: string;
}) {
  if (data.length < 2) return null;
  const chartData = data.map((d) => ({ ...d, idx: d.date }));
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="score"
            stroke={color}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Mastery Breakdown card ----
export function MasteryBreakdownCard({ breakdown }: { breakdown: MasteryBreakdownDTO }) {
  const weighted = Math.round(breakdown.weightedMastery);
  const items = [
    {
      label: "Penyelesaian Pelajaran",
      value: Math.round(breakdown.lessonCompletionPct),
      weight: "40%",
      color: "bg-emerald-500",
    },
    {
      label: "Rata-rata Skor Latihan",
      value: Math.round(breakdown.exerciseScoreAvg),
      weight: "40%",
      color: "bg-teal-500",
    },
    {
      label: "Rata-rata Skor Game",
      value: Math.round(breakdown.gameScoreAvg),
      weight: "20%",
      color: "bg-violet-500",
    },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Rincian Mastery
        </CardTitle>
        <CardDescription>
          Penguasaan terbobot dari penyelesaian, latihan, dan game
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold tabular-nums text-primary">
            {weighted}%
          </span>
          <span className="text-sm text-muted-foreground">
            ({breakdown.lessonsCompleted}/{breakdown.lessonsTotal} pelajaran)
          </span>
        </div>
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {it.label}{" "}
                  <span className="text-xs text-muted-foreground/70">({it.weight})</span>
                </span>
                <span className="font-semibold tabular-nums">{it.value}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${it.color}`}
                  style={{ width: `${Math.min(100, it.value)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ---- Subject Performance cards grid ----
export function SubjectPerformanceGrid({
  subjects,
}: {
  subjects: SubjectPerformanceDTO[];
}) {
  if (subjects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada data performa per mata pelajaran.
      </p>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {subjects.map((s) => (
        <SubjectPerformanceCard key={s.subjectId} subject={s} />
      ))}
    </div>
  );
}

function SubjectPerformanceCard({ subject }: { subject: SubjectPerformanceDTO }) {
  const c = colorClasses(subject.subjectColor);
  const hasSpark = subject.recentScores.length >= 2;
  const ratio =
    subject.lessonsTotal > 0
      ? Math.round((subject.lessonsCompleted / subject.lessonsTotal) * 100)
      : 0;
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.dot}`} />
            <span className={`font-semibold truncate ${c.text}`}>
              {subject.subjectTitle}
            </span>
          </div>
          <TrendBadge trend={subject.trend} delta={subject.trendDelta} />
        </div>
        <div className="flex items-center gap-2">
          <Progress
            value={Math.round(subject.masteryLevel)}
            className="h-2 flex-1"
          />
          <span className={`text-sm font-bold tabular-nums ${c.text}`}>
            {Math.round(subject.masteryLevel)}%
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-muted-foreground">Pelajaran</p>
            <p className="font-semibold tabular-nums">
              {subject.lessonsCompleted}/{subject.lessonsTotal}
              <span className="text-muted-foreground ml-1">({ratio}%)</span>
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-muted-foreground">Latihan</p>
            <p className="font-semibold tabular-nums">
              {subject.exerciseAttempts}
              <span className="text-muted-foreground ml-1">
                ({Math.round(subject.avgExerciseScore)}%)
              </span>
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-muted-foreground">Game</p>
            <p className="font-semibold tabular-nums">
              {subject.gameSessionsCount}
              <span className="text-muted-foreground ml-1">
                ({Math.round(subject.avgGameScore)})
              </span>
            </p>
          </div>
        </div>
        {hasSpark && (
          <div className="pt-1">
            <p className="text-xs text-muted-foreground mb-1">Skor Latihan Terbaru</p>
            <Sparkline data={subject.recentScores} color={c.dot.replace("bg-", "#").replace("-500", "") || "#10b981"} />
          </div>
        )}
        {subject.timeSpentSec > 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(subject.timeSpentSec)} waktu belajar
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Weak Topics list ----
export function WeakTopicsList({ topics }: { topics: WeakTopicDTO[] }) {
  if (topics.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            🎉 Tidak ada topik lemah, kerja bagus!
          </p>
        </CardContent>
      </Card>
    );
  }
  // Sort by masteryLevel asc (weakest first)
  const sorted = [...topics].sort((a, b) => a.masteryLevel - b.masteryLevel);
  return (
    <div className="space-y-3">
      {sorted.map((t) => {
        const c = colorClasses(t.subjectColor);
        const gap = Math.round(t.gap);
        return (
          <Card key={t.topicId}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{t.topicTitle}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <span className={`text-xs ${c.text}`}>{t.subjectTitle}</span>
                  </div>
                </div>
                <SeverityBadge severity={t.severity} />
              </div>
              <div className="flex items-center gap-2">
                <Progress
                  value={Math.round(t.masteryLevel)}
                  className="h-2 flex-1"
                />
                <span className="text-xs font-semibold tabular-nums w-10 text-right">
                  {Math.round(t.masteryLevel)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {t.lessonsCompleted}/{t.lessonsTotal} pelajaran · latihan{" "}
                  {Math.round(t.avgExerciseScore)}%
                </span>
                <span className="text-rose-600 dark:text-rose-400">
                  Gap {gap}% menuju 100%
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---- Trends chart (multi-subject area chart) ----
export function TrendsChart({
  trends,
}: {
  trends: { subjectId: string; subjectTitle: string; color: string; points: TrendPointDTO[] }[];
}) {
  const hasData = trends.some((t) => t.points.length > 0);
  if (!hasData) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Belum ada data tren. Main game dan kerjakan latihan untuk membangun tren.
        </CardContent>
      </Card>
    );
  }
  // Merge into single dataset keyed by date
  const dateMap = new Map<string, Record<string, number | string>>();
  for (const t of trends) {
    for (const p of t.points) {
      const key = p.date;
      if (!dateMap.has(key)) dateMap.set(key, { date: key });
      dateMap.get(key)![t.subjectId] = p.masteryLevel;
    }
  }
  const chartData = Array.from(dateMap.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );

  return (
    <Card>
      <CardContent className="p-4">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 8, left: -12 }}>
              <defs>
                {trends.map((t) => {
                  const color = hexFromColor(t.color);
                  return (
                    <linearGradient key={t.subjectId} id={`grad-${t.subjectId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(d) =>
                  new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
                }
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <RTooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  fontSize: 12,
                }}
                labelFormatter={(d) =>
                  new Date(d as string).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                }
              />
              {trends.map((t) => {
                const color = hexFromColor(t.color);
                return (
                  <Area
                    key={t.subjectId}
                    type="monotone"
                    dataKey={t.subjectId}
                    name={t.subjectTitle}
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#grad-${t.subjectId})`}
                    connectNulls
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3">
          {trends.map((t) => {
            const c = colorClasses(t.color);
            return (
              <div key={t.subjectId} className="flex items-center gap-1.5 text-xs">
                <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                <span className="text-muted-foreground">{t.subjectTitle}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Map color name (emerald/teal/violet/...) to hex for chart strokes
function hexFromColor(color: string): string {
  const map: Record<string, string> = {
    emerald: "#10b981",
    teal: "#14b8a6",
    violet: "#8b5cf6",
    orange: "#f97316",
    rose: "#f43f5e",
    amber: "#f59e0b",
    cyan: "#06b6d4",
    fuchsia: "#d946ef",
  };
  return map[color] ?? "#10b981";
}

// ---- Recommendations list (with optional generate button) ----
export function RecommendationsList({
  recommendations,
  generateButton,
}: {
  recommendations: RecommendationDTO[];
  generateButton?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      {generateButton && <div>{generateButton}</div>}
      {recommendations.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <Sparkles className="w-5 h-5 mx-auto mb-2 text-muted-foreground/60" />
            Belum ada rekomendasi. {generateButton ? "Buat rekomendasi AI untuk mendapatkan saran pembelajaran." : ""}
          </CardContent>
        </Card>
      ) : (
        recommendations.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={r.priority} />
                <Badge variant="outline" className="capitalize">
                  {typeLabel(r.type)}
                </Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatRelative(r.createdAt)}
                </span>
              </div>
              <div className="prose-edu text-sm">
                <ReactMarkdown>{r.content}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function typeLabel(type: string): string {
  switch (type) {
    case "LEARNING":
      return "Pembelajaran";
    case "WEAK_TOPIC":
      return "Topik Lemah";
    case "STUDY_PLAN":
      return "Rencana Belajar";
    default:
      return type;
  }
}

// ---- Recent Activity list ----
const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  EXERCISE: FileText,
  GAME: Gamepad2,
  LESSON: BookOpen,
  ACHIEVEMENT: Award,
  LEVEL_UP: Zap,
};

export function RecentActivityList({
  activities,
}: {
  activities: { type: string; title: string; detail: string; timestamp: string }[];
}) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Belum ada aktivitas terbaru.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y">
          {activities.map((a, i) => {
            const Icon = ACTIVITY_ICONS[a.type] ?? Sparkles;
            return (
              <li key={i} className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  {a.detail && (
                    <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {formatRelative(a.timestamp)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

// ---- Stats row (Level, XP, Streak, Achievements) ----
export function DetailStatsRow({
  stats,
  achievementsUnlocked,
}: {
  stats: {
    level: number;
    totalXP: number;
    currentStreak: number;
    gamesPlayed: number;
    bossesDefeated: number;
    totalCorrect: number;
    totalQuestions: number;
    longestStreak: number;
  };
  achievementsUnlocked: number;
}) {
  const accuracy =
    stats.totalQuestions > 0
      ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100)
      : 0;
  const items = [
    {
      icon: Award,
      label: "Level",
      value: stats.level,
      sub: `${stats.totalXP} XP`,
      color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    },
    {
      icon: Zap,
      label: "Total XP",
      value: stats.totalXP,
      sub: `${stats.bossesDefeated} boss dikalahkan`,
      color: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
    },
    {
      icon: Flame,
      label: "Streak",
      value: `${stats.currentStreak} hari`,
      sub: `terpanjang ${stats.longestStreak} hari`,
      color: "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
    },
    {
      icon: Sparkles,
      label: "Pencapaian",
      value: achievementsUnlocked,
      sub: `akurasi ${accuracy}%`,
      color: "bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400",
    },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{it.label}</p>
                <p className="text-2xl font-bold tabular-nums">{it.value}</p>
                {it.sub && <p className="text-xs text-muted-foreground">{it.sub}</p>}
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${it.color}`}>
                <it.icon className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---- Loading skeleton (multi-section) ----
export function DetailLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16 mt-2" />
              <Skeleton className="h-3 w-24 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full mt-3" />
              <Skeleton className="h-8 w-full mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---- Button helpers for shared use ----
export function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="mb-4 -ml-2">
      <span className="mr-1">←</span> {label}
    </Button>
  );
}
