"use client";

import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Brain,
  Target,
  AlertTriangle,
  TrendingUp,
  Activity,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { useNav } from "@/lib/store";
import { ErrorState } from "@/components/shared/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatRelative } from "@/lib/ui";
import {
  BackButton,
  DetailLoadingSkeleton,
  DetailStatsRow,
  MasteryBreakdownCard,
  SubjectPerformanceGrid,
  WeakTopicsList,
  TrendsChart,
  RecommendationsList,
  RecentActivityList,
} from "@/components/analytics/_shared";

export function ParentChildDetail() {
  const childId = useNav((s) => s.parentSelectedChildId);
  const setView = useNav((s) => s.setView);
  const openReport = useNav((s) => s.openReport);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["student-detail", childId],
    queryFn: () => api.getStudentDetail(childId!),
    enabled: !!childId,
  });

  if (!childId) {
    return <ErrorState message="Tidak ada anak yang dipilih." />;
  }
  if (isLoading) return <DetailLoadingSkeleton />;
  if (isError)
    return <ErrorState message={error?.message ?? "Gagal memuat detail anak"} />;
  if (!data) return null;

  const {
    student,
    profile,
    stats,
    masteryBreakdown,
    subjectPerformance,
    weakTopics,
    trends,
    recentActivity,
    recommendations,
    achievementsUnlocked,
  } = data;
  const initials = student.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <BackButton onClick={() => setView("dashboard")} label="Kembali" />

      {/* Student header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar className="w-16 h-16 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{student.name}</h2>
              <p className="text-sm text-muted-foreground truncate">
                {student.email}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {profile?.educationLevel && (
                  <Badge variant="outline">{profile.educationLevel}</Badge>
                )}
                {profile?.targetExam && (
                  <Badge variant="outline" className="text-primary">
                    Target: {profile.targetExam}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Bergabung {formatRelative(student.createdAt)}
                </span>
              </div>
            </div>
            <Button
              onClick={() => openReport(student.id)}
              className="shrink-0"
            >
              <FileText className="w-4 h-4 mr-1" />
              Lihat Laporan
            </Button>
          </div>
          {profile?.bio && (
            <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
              {profile.bio}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats row */}
      <DetailStatsRow stats={stats} achievementsUnlocked={achievementsUnlocked} />

      {/* Mastery Breakdown */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Rincian Mastery
        </h2>
        <MasteryBreakdownCard breakdown={masteryBreakdown} />
      </section>

      {/* Subject Performance */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          Performa per Materi
        </h2>
        <SubjectPerformanceGrid subjects={subjectPerformance} />
      </section>

      {/* Weak Topics */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-primary" />
          Topik Lemah
        </h2>
        <WeakTopicsList topics={weakTopics} />
      </section>

      {/* Trends */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Tren Mastery
        </h2>
        <TrendsChart trends={trends} />
      </section>

      {/* Recommendations (read-only for parent) */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Rekomendasi Pembelajaran
        </h2>
        <RecommendationsList recommendations={recommendations} />
      </section>

      {/* Recent Activity */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Aktivitas Terbaru
        </h2>
        <RecentActivityList activities={recentActivity} />
      </section>
    </div>
  );
}

export default ParentChildDetail;
