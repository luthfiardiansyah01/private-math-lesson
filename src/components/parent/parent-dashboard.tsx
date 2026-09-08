"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Flame,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  Eye,
} from "lucide-react";
import { api } from "@/lib/api";
import { useNav } from "@/lib/store";
import {
  PageHeader,
  LoadingGrid,
  EmptyState,
  ErrorState,
} from "@/components/shared/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatRelative } from "@/lib/ui";
import { TrendBadge } from "@/components/analytics/_shared";
import type { ParentDashboardDTO } from "@/lib/analytics-types";

export function ParentDashboard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["parent-dashboard"],
    queryFn: () => api.getParentDashboard(),
  });
  const openParentChildDetail = useNav((s) => s.openParentChildDetail);
  const openParentLinkChild = useNav((s) => s.openParentLinkChild);

  if (isLoading) return <LoadingGrid count={3} />;
  if (isError)
    return <ErrorState message={error?.message ?? "Gagal memuat dashboard"} />;
  if (!data) return null;

  if (data.children.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Orang Tua"
          description="Pantau perkembangan belajar anak Anda."
        />
        <EmptyState
          icon={Users}
          title="Belum ada anak ditautkan"
          description="Tautkan akun siswa anak Anda untuk mulai memantau perkembangan belajarnya."
          action={
            <Button onClick={openParentLinkChild}>
              <UserPlus className="w-4 h-4 mr-2" />
              Tautkan Akun Anak
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Orang Tua"
        description="Pantau perkembangan belajar anak Anda."
        action={
          <Button variant="outline" onClick={openParentLinkChild}>
            <UserPlus className="w-4 h-4 mr-2" />
            Tautkan Anak Lain
          </Button>
        }
      />

      {/* Parent info banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
            {data.parent.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{data.parent.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {data.parent.email} · {data.children.length} anak ditautkan
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Children grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.children.map((child) => (
          <ChildCard
            key={child.studentId}
            child={child}
            onView={() => openParentChildDetail(child.studentId)}
          />
        ))}
      </div>
    </div>
  );
}

function ChildCard({
  child,
  onView,
}: {
  child: ParentDashboardDTO["children"][number];
  onView: () => void;
}) {
  const ratio =
    child.lessonsTotal > 0
      ? Math.round((child.lessonsCompleted / child.lessonsTotal) * 100)
      : 0;
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar className="w-12 h-12 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {child.avatarInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{child.name}</p>
            <Badge variant="outline" className="mt-1 text-xs">
              {child.relation}
            </Badge>
          </div>
        </div>

        {/* Level + XP */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-100">
            Level {child.level}
          </Badge>
          <Badge variant="outline" className="tabular-nums">
            <Zap className="w-3 h-3 mr-1" />
            {child.totalXP} XP
          </Badge>
          {child.currentStreak > 0 && (
            <Badge variant="outline" className="tabular-nums text-orange-700 dark:text-orange-300">
              <Flame className="w-3 h-3 mr-1" />
              {child.currentStreak} hari
            </Badge>
          )}
        </div>

        {/* Mastery */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Rata-rata Mastery</span>
            <span className="font-bold tabular-nums text-primary">
              {Math.round(child.avgMastery)}%
            </span>
          </div>
          <Progress value={Math.round(child.avgMastery)} className="h-2" />
        </div>

        {/* Lessons + weak topics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-muted-foreground">Pelajaran</p>
            <p className="font-semibold tabular-nums">
              {child.lessonsCompleted}/{child.lessonsTotal}
              <span className="text-muted-foreground ml-1">({ratio}%)</span>
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-muted-foreground">Topik Lemah</p>
            {child.weakTopicCount > 0 ? (
              <p className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                {child.weakTopicCount}
              </p>
            ) : (
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                Tidak ada
              </p>
            )}
          </div>
        </div>

        {/* Top weak topic */}
        {child.topWeakTopic && (
          <p className="text-xs text-rose-600 dark:text-rose-400 truncate">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            {child.topWeakTopic}
          </p>
        )}

        {/* Trend + last active */}
        <div className="flex items-center justify-between pt-2 border-t">
          <TrendBadge trend={child.trend} />
          <span className="text-xs text-muted-foreground">
            {formatRelative(child.lastActive)}
          </span>
        </div>

        {/* Action */}
        <Button onClick={onView} className="w-full" variant="outline">
          <Eye className="w-4 h-4 mr-2" />
          Lihat Detail
          <ArrowUpRight className="w-3 h-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default ParentDashboard;
