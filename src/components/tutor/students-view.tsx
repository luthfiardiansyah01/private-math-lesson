"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Brain,
  BookOpen,
  Clock,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRelative } from "@/lib/ui";

export function StudentsView() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tutor-dashboard"],
    queryFn: () => api.getTutorDashboard(),
  });

  const summary = useMemo(() => {
    if (!data) return { total: 0, avgMastery: 0, totalLessons: 0 };
    const total = data.recentStudents.length;
    const avgMastery =
      total > 0
        ? Math.round(
            data.recentStudents.reduce((s, st) => s + st.avgMastery, 0) / total
          )
        : 0;
    const totalLessons = data.recentStudents.reduce(
      (s, st) => s + st.lessonsCompleted,
      0
    );
    return { total, avgMastery, totalLessons };
  }, [data]);

  if (isLoading) return <LoadingGrid count={4} />;
  if (isError)
    return <ErrorState message={error?.message ?? "Gagal memuat data siswa"} />;
  if (!data) return null;

  const students = data.recentStudents;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Siswa Saya"
        description="Pantau aktivitas dan progress siswa di materi kamu."
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Siswa"
          value={summary.total}
          sub="siswa aktif"
          color="violet"
        />
        <StatCard
          icon={Brain}
          label="Rata-rata Mastery"
          value={`${summary.avgMastery}%`}
          sub="penguasaan"
          color="emerald"
        />
        <StatCard
          icon={BookOpen}
          label="Total Pelajaran"
          value={summary.totalLessons}
          sub="diselesaikan"
          color="teal"
        />
        <StatCard
          icon={Clock}
          label="Total Sesi"
          value={data.stats.totalSessions}
          sub="sesi belajar"
          color="orange"
        />
      </div>

      {/* Students table */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Daftar Siswa
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Siswa Terbaru</CardTitle>
            <CardDescription>
              8 siswa terakhir yang aktif di materi kamu
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {students.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Belum ada siswa"
                description="Siswa yang belajar materi kamu akan muncul di sini."
              />
            ) : (
              <>
                {/* Desktop: table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Siswa</TableHead>
                        <TableHead className="text-center">Pelajaran</TableHead>
                        <TableHead className="min-w-[160px]">Mastery</TableHead>
                        <TableHead className="text-right pr-6">
                          Aktif Terakhir
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((s) => {
                        const initials = s.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase();
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-9 h-9 shrink-0">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{s.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {s.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center tabular-nums">
                              {s.lessonsCompleted}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={Math.round(s.avgMastery)}
                                  className="h-2 flex-1"
                                />
                                <span className="text-xs font-semibold tabular-nums w-10 text-right">
                                  {Math.round(s.avgMastery)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-6 text-sm text-muted-foreground">
                              {formatRelative(s.lastActive)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile: card list */}
                <ul className="md:hidden divide-y">
                  {students.map((s) => {
                    const initials = s.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    return (
                      <li key={s.id} className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {s.email}
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {formatRelative(s.lastActive)}
                          </Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-lg bg-muted/50 p-2.5">
                            <p className="text-xs text-muted-foreground">
                              Pelajaran
                            </p>
                            <p className="font-semibold tabular-nums">
                              {s.lessonsCompleted}
                            </p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-2.5">
                            <p className="text-xs text-muted-foreground">
                              Mastery
                            </p>
                            <p className="font-semibold tabular-nums text-primary">
                              {Math.round(s.avgMastery)}%
                            </p>
                          </div>
                        </div>
                        <Progress
                          value={Math.round(s.avgMastery)}
                          className="h-1.5 mt-2"
                        />
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default StudentsView;
