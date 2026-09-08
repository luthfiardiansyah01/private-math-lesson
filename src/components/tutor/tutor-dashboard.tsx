"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  FileText,
  PenTool,
  Users,
  Plus,
  ArrowRight,
  Settings2,
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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { colorClasses, subjectIcon, formatRelative } from "@/lib/ui";

// Render a subject icon by name without triggering the
// `react-hooks/static-components` rule (which forbids assigning the result
// of a hook call to a capitalized local inside a component body).
function renderSubjectIcon(name: string, className?: string) {
  return React.createElement(subjectIcon(name), { className });
}

export function TutorDashboard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tutor-dashboard"],
    queryFn: () => api.getTutorDashboard(),
  });
  const setView = useNav((s) => s.setView);
  const openManage = useNav((s) => s.openManage);

  if (isLoading) return <LoadingGrid count={4} />;
  if (isError)
    return <ErrorState message={error?.message ?? "Gagal memuat dashboard"} />;
  if (!data) return null;

  const { user, stats, subjects, recentStudents } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Halo, ${user.name}! 👋`}
        description="Kelola materi dan pantau progress siswa."
        action={
          <Button
            onClick={() => setView("manage")}
            className="hidden sm:inline-flex"
          >
            <Settings2 className="w-4 h-4" />
            Kelola Materi
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="Mata Pelajaran"
          value={stats.subjectsCount}
          sub="mata pelajaran"
          color="emerald"
        />
        <StatCard
          icon={FileText}
          label="Total Pelajaran"
          value={stats.lessonsCount}
          sub="pelajaran"
          color="teal"
        />
        <StatCard
          icon={PenTool}
          label="Total Latihan"
          value={stats.exercisesCount}
          sub="latihan"
          color="orange"
        />
        <StatCard
          icon={Users}
          label="Siswa Aktif"
          value={stats.studentsCount}
          sub="siswa"
          color="violet"
        />
      </div>

      {/* My subjects */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Mata Pelajaran Saya
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView("manage")}
            className="shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah</span>
          </Button>
        </div>

        {subjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Belum ada mata pelajaran"
            description="Buat mata pelajaran pertamamu untuk mulai mengajar."
            action={
              <Button onClick={() => setView("manage")}>
                <Plus className="w-4 h-4" />
                Buat Materi
              </Button>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((s) => {
              const c = colorClasses(s.color);
              return (
                <Card key={s.id} className="overflow-hidden py-0 flex flex-col">
                  <div className={`h-1.5 w-full ${c.dot}`} />
                  <CardHeader className="pt-5">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}
                      >
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate">{s.title}</CardTitle>
                        <CardDescription className="truncate">
                          {s.topicsCount} topik · {s.lessonsCount} pelajaran
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {s.studentsCount} siswa
                      </span>
                      <span className={`font-semibold ${c.text}`}>
                        {Math.round(s.avgMastery)}% mastery
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => openManage(s.id)}
                    >
                      Kelola
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent students */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Siswa Terbaru
        </h2>
        <Card>
          <CardContent className="p-0">
            {recentStudents.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Belum ada siswa"
                description="Siswa yang belajar materi kamu akan muncul di sini."
              />
            ) : (
              <ul className="divide-y">
                {recentStudents.map((s) => {
                  const initials = s.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  return (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 sm:gap-4 p-4"
                    >
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
                      <div className="hidden sm:block text-right text-xs w-20">
                        <p className="text-muted-foreground">Pelajaran</p>
                        <p className="font-medium tabular-nums">
                          {s.lessonsCompleted}
                        </p>
                      </div>
                      <div className="text-right text-xs w-16">
                        <p className="text-muted-foreground">Mastery</p>
                        <p className="font-semibold text-primary tabular-nums">
                          {Math.round(s.avgMastery)}%
                        </p>
                      </div>
                      <div className="hidden md:block text-right text-xs text-muted-foreground w-24">
                        {formatRelative(s.lastActive)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default TutorDashboard;
