"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Brain,
  Clock,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  Award,
  Target,
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

interface SubjectMastery {
  subjectId: string;
  subjectTitle: string;
  color: string;
  topicId: string | null;
  topicTitle: string;
  level: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  avgExerciseScore: number;
}

interface ProgressRow {
  lessonId: string;
  lessonTitle: string;
  topicTitle: string;
  subjectTitle: string;
  subjectColor: string;
  status: string;
  completionPct: number;
  timeSpentSec: number;
  lastAccessedAt: string | null;
}

export function ProgressView() {
  const { data: progress, isLoading: pLoading, isError: pErr, error: pError } = useQuery({
    queryKey: ["progress"],
    queryFn: () => api.getProgress(),
  });
  const { data: mastery, isLoading: mLoading, isError: mErr, error: mError } = useQuery({
    queryKey: ["mastery"],
    queryFn: () => api.getMastery(),
  });

  const setView = useNav((s) => s.setView);

  const isLoading = pLoading || mLoading;
  const isError = pErr || mErr;
  const error = pError || mError;

  // Group progress rows by subject for the detailed list.
  const groupedProgress = useMemo(() => {
    if (!progress) return [];
    const map = new Map<string, { subjectTitle: string; subjectColor: string; rows: ProgressRow[] }>();
    for (const p of progress as ProgressRow[]) {
      const key = p.subjectTitle;
      if (!map.has(key)) {
        map.set(key, {
          subjectTitle: p.subjectTitle,
          subjectColor: p.subjectColor,
          rows: [],
        });
      }
      map.get(key)!.rows.push(p);
    }
    return Array.from(map.values());
  }, [progress]);

  const summary = useMemo(() => {
    const subjects = (mastery?.subjects ?? []) as SubjectMastery[];
    const completedLessons = subjects.reduce((n, s) => n + s.lessonsCompleted, 0);
    const totalLessons = subjects.reduce((n, s) => n + s.lessonsTotal, 0);
    const totalTime = (progress ?? []).reduce((n, p) => n + p.timeSpentSec, 0);
    const avgMastery =
      subjects.length > 0
        ? Math.round(subjects.reduce((s, m) => s + m.level, 0) / subjects.length)
        : 0;
    return { completedLessons, totalLessons, totalTime, avgMastery };
  }, [mastery, progress]);

  if (isLoading) return <LoadingGrid count={4} />;
  if (isError) return <ErrorState message={error?.message ?? "Gagal memuat progress"} />;

  const subjects = (mastery?.subjects ?? []) as SubjectMastery[];
  const progressRows = (progress ?? []) as ProgressRow[];

  if (progressRows.length === 0 && subjects.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Progress Saya"
          description="Pantau perkembangan belajar kamu di setiap materi."
        />
        <EmptyState
          icon={BarChart3}
          title="Belum ada progress"
          description="Mulai belajar untuk melihat progress kamu di sini."
          action={
            <Button onClick={() => setView("subjects")}>
              <BookOpen className="w-4 h-4" />
              Mulai Belajar
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress Saya"
        description="Pantau perkembangan belajar kamu di setiap materi."
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CheckCircle2}
          label="Materi Selesai"
          value={`${summary.completedLessons}/${summary.totalLessons}`}
          sub="pelajaran"
          color="emerald"
        />
        <StatCard
          icon={Clock}
          label="Total Waktu"
          value={formatDuration(summary.totalTime)}
          sub="durasi belajar"
          color="teal"
        />
        <StatCard
          icon={Brain}
          label="Rata-rata Mastery"
          value={`${summary.avgMastery}%`}
          sub="penguasaan"
          color="violet"
        />
        <StatCard
          icon={Target}
          label="Subjek Aktif"
          value={subjects.length}
          sub="mata pelajaran"
          color="orange"
        />
      </div>

      {/* Mastery per subject */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          Mastery per Materi
        </h2>
        {subjects.length === 0 ? (
          <EmptyState
            icon={Brain}
            title="Belum ada data mastery"
            description="Selesaikan pelajaran & latihan untuk membangun mastery."
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((s) => {
              const c = colorClasses(s.color);
              const ratio = s.lessonsTotal > 0 ? Math.round((s.lessonsCompleted / s.lessonsTotal) * 100) : 0;
              return (
                <Card key={s.subjectId}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.dot}`} />
                        <CardTitle className="truncate text-base">
                          {s.subjectTitle}
                        </CardTitle>
                      </div>
                      <span className={`text-2xl font-bold tabular-nums ${c.text}`}>
                        {Math.round(s.level)}%
                      </span>
                    </div>
                    <CardDescription>Level penguasaan materi</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Progress value={Math.round(s.level)} />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-muted/50 p-2.5">
                        <p className="text-xs text-muted-foreground">Pelajaran</p>
                        <p className="font-semibold mt-0.5">
                          {s.lessonsCompleted}/{s.lessonsTotal}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({ratio}%)
                          </span>
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2.5">
                        <p className="text-xs text-muted-foreground">Avg. Latihan</p>
                        <p className="font-semibold mt-0.5 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-primary" />
                          {Math.round(s.avgExerciseScore)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Progress per lesson */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Progress per Pelajaran
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Riwayat Pelajaran</CardTitle>
            <CardDescription>
              Detail progress untuk setiap pelajaran yang kamu akses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {groupedProgress.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Belum ada pelajaran diakses"
                description="Buka pelajaran untuk mulai melacak progress."
              />
            ) : (
              <div className="max-h-96 overflow-y-auto -mx-2 px-2 space-y-5">
                {groupedProgress.map((g) => {
                  const c = colorClasses(g.subjectColor);
                  return (
                    <div key={g.subjectTitle} className="space-y-2">
                      <div className="flex items-center gap-2 sticky top-0 bg-card py-1 z-10">
                        <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                        <h3 className="font-medium text-sm">{g.subjectTitle}</h3>
                        <Badge variant="outline" className="ml-auto">
                          {g.rows.length} pelajaran
                        </Badge>
                      </div>
                      <ul className="space-y-2">
                        {g.rows.map((r) => (
                          <li
                            key={r.lessonId}
                            className="rounded-lg border p-3 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {r.lessonTitle}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {r.topicTitle}
                                </p>
                              </div>
                              <Badge className={`shrink-0 ${statusBadgeClass(r.status)}`}>
                                {statusLabel(r.status)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={r.completionPct}
                                className="h-1.5 flex-1"
                              />
                              <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">
                                {r.completionPct}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDuration(r.timeSpentSec)}
                              </span>
                              <span>{formatRelative(r.lastAccessedAt)}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default ProgressView;
