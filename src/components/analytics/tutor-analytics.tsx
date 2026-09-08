"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Brain,
  FileText,
  Users,
  UserCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  AlertTriangle,
  ArrowUpRight,
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { colorClasses, formatRelative } from "@/lib/ui";
import type { StudentAnalyticsSummaryDTO } from "@/lib/analytics-types";

// ---- Trend badge helper ----
type TrendType = "IMPROVING" | "DECLINING" | "STABLE" | "NEW";

function TrendBadge({ trend }: { trend: TrendType }) {
  switch (trend) {
    case "IMPROVING":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-100">
          <TrendingUp className="w-3 h-3 mr-1" /> Naik
        </Badge>
      );
    case "DECLINING":
      return (
        <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-100">
          <TrendingDown className="w-3 h-3 mr-1" /> Turun
        </Badge>
      );
    case "NEW":
      return (
        <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 hover:bg-sky-100">
          <Plus className="w-3 h-3 mr-1" /> Baru
        </Badge>
      );
    case "STABLE":
    default:
      return (
        <Badge variant="secondary">
          <Minus className="w-3 h-3 mr-1" /> Stabil
        </Badge>
      );
  }
}

export function TutorAnalytics() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tutor-analytics"],
    queryFn: () => api.getTutorAnalytics(),
  });
  const openStudentDetail = useNav((s) => s.openStudentDetail);

  if (isLoading) return <LoadingGrid count={4} />;
  if (isError)
    return <ErrorState message={error?.message ?? "Gagal memuat analitik"} />;
  if (!data) return null;

  // Empty state — no students at all
  if (data.students.length === 0 && data.overview.totalStudents === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analitik & Insight"
          description="Pantau perkembangan dan kelemahan siswa."
        />
        <EmptyState
          icon={BarChart3}
          title="Belum ada data analitik"
          description="Siswa yang belajar di materi Anda akan muncul di sini."
        />
      </div>
    );
  }

  const { overview, students, subjectOverview } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analitik & Insight"
        description="Pantau perkembangan dan kelemahan siswa."
      />

      {/* Overview StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Siswa"
          value={overview.totalStudents}
          sub={`${overview.totalSubjects} mata pelajaran`}
          color="emerald"
        />
        <StatCard
          icon={UserCheck}
          label="Siswa Aktif Minggu Ini"
          value={overview.activeStudentsThisWeek}
          sub={`${overview.totalLessons} pelajaran`}
          color="teal"
        />
        <StatCard
          icon={Brain}
          label="Rata-rata Mastery"
          value={`${Math.round(overview.avgMasteryAcrossStudents)}%`}
          sub="penguasaan siswa"
          color="violet"
        />
        <StatCard
          icon={FileText}
          label="Total Latihan"
          value={overview.totalExerciseAttempts}
          sub={`${overview.totalGameSessions} sesi game`}
          color="orange"
        />
      </div>

      {/* Subject Overview */}
      {subjectOverview.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Ringkasan per Mata Pelajaran
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectOverview.map((s) => {
              const c = colorClasses(s.color);
              return (
                <Card key={s.subjectId}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.dot}`} />
                        <span className={`font-semibold truncate ${c.text}`}>
                          {s.subjectTitle}
                        </span>
                      </div>
                      {s.weakTopicCount > 0 && (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-rose-200 text-rose-700 dark:border-rose-800 dark:text-rose-300"
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {s.weakTopicCount} lemah
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.round(s.avgMastery)}
                        className="h-2 flex-1"
                      />
                      <span className={`text-sm font-bold tabular-nums ${c.text}`}>
                        {Math.round(s.avgMastery)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.studentCount} siswa aktif
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Daftar Siswa */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Daftar Siswa
        </h2>
        <Card>
          <CardContent className="p-0">
            {students.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Belum ada siswa"
                description="Siswa yang belajar di materi Anda akan muncul di sini."
              />
            ) : (
              <>
                {/* Desktop: table */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Siswa</TableHead>
                        <TableHead className="text-center">Level</TableHead>
                        <TableHead className="min-w-[150px]">Mastery</TableHead>
                        <TableHead className="text-center">Pelajaran</TableHead>
                        <TableHead className="text-center">Latihan</TableHead>
                        <TableHead className="min-w-[180px]">Topik Lemah</TableHead>
                        <TableHead className="text-center">Tren</TableHead>
                        <TableHead className="text-right pr-6">Aktif</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((s) => (
                        <StudentTableRow
                          key={s.studentId}
                          student={s}
                          onClick={() => openStudentDetail(s.studentId)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile: card list */}
                <ul className="lg:hidden divide-y">
                  {students.map((s) => (
                    <StudentMobileRow
                      key={s.studentId}
                      student={s}
                      onClick={() => openStudentDetail(s.studentId)}
                    />
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StudentTableRow({
  student,
  onClick,
}: {
  student: StudentAnalyticsSummaryDTO;
  onClick: () => void;
}) {
  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={onClick}
    >
      <TableCell className="pl-6">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {student.avatarInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate">{student.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {student.email}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="outline" className="tabular-nums">
          Lv. {student.level}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Progress
            value={Math.round(student.avgMastery)}
            className="h-2 flex-1"
          />
          <span className="text-xs font-semibold tabular-nums w-10 text-right">
            {Math.round(student.avgMastery)}%
          </span>
        </div>
      </TableCell>
      <TableCell className="text-center tabular-nums text-sm">
        {student.lessonsCompleted}
        <span className="text-muted-foreground">/{student.lessonsTotal}</span>
      </TableCell>
      <TableCell className="text-center tabular-nums text-sm">
        {student.exercisesTaken}
        <span className="text-muted-foreground ml-1">
          ({Math.round(student.avgExerciseScore)}%)
        </span>
      </TableCell>
      <TableCell>
        {student.weakTopicCount > 0 ? (
          <div className="min-w-0">
            <Badge
              variant="outline"
              className="border-rose-200 text-rose-700 dark:border-rose-800 dark:text-rose-300"
            >
              {student.weakTopicCount} topik
            </Badge>
            {student.topWeakTopic && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {student.topWeakTopic}
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        <TrendBadge trend={student.trend} />
      </TableCell>
      <TableCell className="text-right pr-6 text-sm text-muted-foreground">
        {formatRelative(student.lastActive)}
      </TableCell>
    </TableRow>
  );
}

function StudentMobileRow({
  student,
  onClick,
}: {
  student: StudentAnalyticsSummaryDTO;
  onClick: () => void;
}) {
  return (
    <li
      className="p-4 cursor-pointer hover:bg-muted/40"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {student.avatarInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{student.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {student.email}
          </p>
        </div>
        <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-muted-foreground">Level</p>
          <p className="font-semibold tabular-nums">Lv. {student.level}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-muted-foreground">Pelajaran</p>
          <p className="font-semibold tabular-nums">
            {student.lessonsCompleted}/{student.lessonsTotal}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-muted-foreground">Latihan</p>
          <p className="font-semibold tabular-nums">
            {student.exercisesTaken} ({Math.round(student.avgExerciseScore)}%)
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Progress
          value={Math.round(student.avgMastery)}
          className="h-1.5 flex-1"
        />
        <span className="text-xs font-semibold tabular-nums">
          {Math.round(student.avgMastery)}%
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <TrendBadge trend={student.trend} />
        <span className="text-xs text-muted-foreground">
          {formatRelative(student.lastActive)}
        </span>
      </div>
      {student.weakTopicCount > 0 && student.topWeakTopic && (
        <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 truncate">
          <AlertTriangle className="w-3 h-3 inline mr-1" />
          Lemah: {student.topWeakTopic}
        </p>
      )}
    </li>
  );
}

export default TutorAnalytics;
