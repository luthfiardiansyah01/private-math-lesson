"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Printer,
  Calendar,
  CheckCircle2,
  FileText,
  Gamepad2,
  Clock,
  Award,
  Zap,
  Flame,
  Sword,
  AlertTriangle,
  Sparkles,
  Activity,
} from "lucide-react";
import { api } from "@/lib/api";
import { useNav } from "@/lib/store";
import { ErrorState } from "@/components/shared/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import { colorClasses, formatDuration, formatRelative } from "@/lib/ui";
import {
  TrendBadge,
  SeverityBadge,
  PriorityBadge,
  BackButton,
} from "@/components/analytics/_shared";

function ReportLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-9 w-64" />
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full mt-3" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function ReportView() {
  const studentId = useNav((s) => s.reportStudentId);
  const period = useNav((s) => s.reportPeriod);
  const setReportPeriod = useNav((s) => s.setReportPeriod);
  const openStudentDetail = useNav((s) => s.openStudentDetail);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["report", studentId, period],
    queryFn: () => api.getReport(studentId!, period),
    enabled: !!studentId,
  });

  if (!studentId) {
    return <ErrorState message="Tidak ada siswa yang dipilih." />;
  }
  if (isLoading) return <ReportLoadingSkeleton />;
  if (isError) return <ErrorState message={error?.message ?? "Gagal memuat laporan"} />;
  if (!data) return null;

  const { student, profile, period: periodData, stats, subjectPerformance, weakTopics, recentActivity, recommendations, achievementsUnlocked, summary } = data;

  const periodLabel = periodData.type === "WEEKLY" ? "Mingguan" : "Bulanan";
  const startStr = new Date(periodData.start).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const endStr = new Date(periodData.end).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const generatedAt = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const accuracy =
    stats.lessonsTotal > 0
      ? Math.round((stats.lessonsCompleted / stats.lessonsTotal) * 100)
      : 0;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .report-printable, .report-printable * { visibility: visible; }
          .report-printable { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          .no-print { display: none !important; }
          .report-printable .print-break-avoid { break-inside: avoid; page-break-inside: avoid; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      <div className="space-y-6">
        {/* Non-printable controls */}
        <div className="no-print space-y-4">
          <BackButton
            onClick={() => openStudentDetail(studentId)}
            label="Kembali ke Detail Siswa"
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                Laporan {periodLabel}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {student.name} · {startStr} — {endStr}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tabs
                value={period}
                onValueChange={(v) => setReportPeriod(v as "WEEKLY" | "MONTHLY")}
              >
                <TabsList>
                  <TabsTrigger value="WEEKLY">Mingguan</TabsTrigger>
                  <TabsTrigger value="MONTHLY">Bulanan</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Cetak / PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Printable report content */}
        <div className="report-printable space-y-6">
          {/* Report header */}
          <div className="border-b pb-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    E
                  </div>
                  <span className="text-xl font-bold">EduTrack</span>
                </div>
                <h1 className="text-2xl font-bold mt-3">
                  Laporan {periodLabel}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {student.name} · {student.email}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium">Periode Laporan</p>
                <p className="text-muted-foreground">
                  {startStr} — {endStr}
                </p>
                {profile?.educationLevel && (
                  <p className="text-muted-foreground mt-2">
                    {profile.educationLevel}
                  </p>
                )}
                {profile?.targetExam && (
                  <p className="text-muted-foreground">
                    Target: {profile.targetExam}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          <Card className="print-break-avoid bg-primary/5 border-primary/20">
            <CardContent className="p-5">
              <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Ringkasan
              </h2>
              <div className="prose-edu text-sm">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* Stats grid */}
          <section className="print-break-avoid">
            <h2 className="text-lg font-semibold mb-3">Statistik Periode</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <ReportStat
                icon={CheckCircle2}
                label="Pelajaran Selesai"
                value={`${stats.lessonsCompleted}/${stats.lessonsTotal}`}
                sub={`${accuracy}% selesai`}
              />
              <ReportStat
                icon={FileText}
                label="Latihan"
                value={`${stats.exercisesTaken}`}
                sub={`rata-rata ${Math.round(stats.avgExerciseScore)}%`}
              />
              <ReportStat
                icon={Gamepad2}
                label="Game Dimainkan"
                value={stats.gamesPlayed}
                sub={`${stats.bossesDefeated} boss dikalahkan`}
              />
              <ReportStat
                icon={Clock}
                label="Total Waktu"
                value={formatDuration(stats.totalTimeSpentSec)}
                sub="durasi belajar"
              />
              <ReportStat
                icon={Award}
                label="Level"
                value={stats.level}
                sub={`${stats.totalXP} XP`}
              />
              <ReportStat
                icon={Zap}
                label="Total XP"
                value={stats.totalXP}
                sub={`+${stats.totalXP} poin`}
              />
              <ReportStat
                icon={Flame}
                label="Streak"
                value={`${stats.currentStreak} hari`}
                sub="beruntun"
              />
              <ReportStat
                icon={Sword}
                label="Bosses"
                value={stats.bossesDefeated}
                sub={`${achievementsUnlocked} lencana`}
              />
            </div>
          </section>

          {/* Subject Performance table */}
          <section className="print-break-avoid">
            <h2 className="text-lg font-semibold mb-3">Performa per Mata Pelajaran</h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Mata Pelajaran</TableHead>
                      <TableHead className="min-w-[140px]">Mastery</TableHead>
                      <TableHead className="text-center">Pelajaran</TableHead>
                      <TableHead className="text-center">Latihan</TableHead>
                      <TableHead className="text-center">Tren</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjectPerformance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                          Belum ada data performa.
                        </TableCell>
                      </TableRow>
                    ) : (
                      subjectPerformance.map((s) => {
                        const c = colorClasses(s.subjectColor);
                        return (
                          <TableRow key={s.subjectId}>
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                                <span className={`font-medium ${c.text}`}>
                                  {s.subjectTitle}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={Math.round(s.masteryLevel)}
                                  className="h-2 flex-1"
                                />
                                <span className="text-xs font-semibold tabular-nums w-9 text-right">
                                  {Math.round(s.masteryLevel)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-sm">
                              {s.lessonsCompleted}/{s.lessonsTotal}
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-sm">
                              {s.exerciseAttempts}
                              <span className="text-muted-foreground ml-1">
                                ({Math.round(s.avgExerciseScore)}%)
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <TrendBadge trend={s.trend} delta={s.trendDelta} />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>

          {/* Weak topics */}
          <section className="print-break-avoid">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Topik yang Perlu Diperkuat
            </h2>
            {weakTopics.length === 0 ? (
              <Card>
                <CardContent className="p-5 text-center text-sm text-emerald-600 dark:text-emerald-400">
                  🎉 Tidak ada topik lemah pada periode ini.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {weakTopics
                  .slice()
                  .sort((a, b) => a.masteryLevel - b.masteryLevel)
                  .map((t) => {
                    const c = colorClasses(t.subjectColor);
                    return (
                      <Card key={t.topicId}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <SeverityBadge severity={t.severity} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{t.topicTitle}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                              <span className={`text-xs ${c.text}`}>{t.subjectTitle}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 w-32">
                            <Progress
                              value={Math.round(t.masteryLevel)}
                              className="h-2 flex-1"
                            />
                            <span className="text-xs font-semibold tabular-nums w-10 text-right">
                              {Math.round(t.masteryLevel)}%
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </section>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <section className="print-break-avoid">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Rekomendasi
              </h2>
              <div className="space-y-2">
                {recommendations.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <PriorityBadge priority={r.priority} />
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatRelative(r.createdAt)}
                        </span>
                      </div>
                      <div className="prose-edu text-sm">
                        <ReactMarkdown>{r.content}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Recent Activity */}
          <section className="print-break-avoid">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-5 h-4 text-primary" />
              Aktivitas Terbaru
            </h2>
            {recentActivity.length === 0 ? (
              <Card>
                <CardContent className="p-5 text-center text-sm text-muted-foreground">
                  Tidak ada aktivitas terbaru pada periode ini.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {recentActivity.map((a, i) => (
                      <li key={i} className="p-3 flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <ActivityIcon type={a.type} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{a.title}</p>
                          {a.detail && (
                            <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(a.timestamp).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Footer */}
          <div className="border-t pt-4 text-center text-xs text-muted-foreground">
            <p>Dibuat oleh EduTrack pada {generatedAt}</p>
          </div>
        </div>
      </div>
    </>
  );
}

function ReportStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-lg font-bold tabular-nums mt-0.5 truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
          </div>
          <Icon className="w-5 h-5 text-primary shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityIcon({ type }: { type: string }) {
  // Pick icon based on activity type
  const iconMap: Record<string, typeof CheckCircle2> = {
    EXERCISE: FileText,
    GAME: Gamepad2,
    LESSON: CheckCircle2,
    ACHIEVEMENT: Award,
    LEVEL_UP: Zap,
  };
  const Icon = iconMap[type] ?? Activity;
  return <Icon className="w-3.5 h-3.5" />;
}

export default ReportView;
