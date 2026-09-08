"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Sparkles,
  Brain,
  Target,
  AlertTriangle,
  TrendingUp,
  Activity,
  FileText,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useNav } from "@/lib/store";
import {
  PageHeader,
  ErrorState,
} from "@/components/shared/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
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

export function StudentDetailAnalytics() {
  const studentId = useNav((s) => s.analyticsStudentId);
  const openTutorAnalytics = useNav((s) => s.openTutorAnalytics);
  const openReport = useNav((s) => s.openReport);
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["student-detail", studentId],
    queryFn: () => api.getStudentDetail(studentId!),
    enabled: !!studentId,
  });

  const generateMutation = useMutation({
    mutationFn: () => api.generateRecommendation(studentId!),
    onMutate: () => setIsGenerating(true),
    onSuccess: () => {
      toast.success("Rekomendasi dibuat!");
      queryClient.invalidateQueries({ queryKey: ["student-detail", studentId] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal membuat rekomendasi");
    },
    onSettled: () => setIsGenerating(false),
  });

  if (!studentId) {
    return (
      <ErrorState message="Tidak ada siswa yang dipilih. Kembali ke analitik." />
    );
  }
  if (isLoading) return <DetailLoadingSkeleton />;
  if (isError)
    return <ErrorState message={error?.message ?? "Gagal memuat detail siswa"} />;
  if (!data) return null;

  const { student, profile, stats, masteryBreakdown, subjectPerformance, weakTopics, trends, recentActivity, recommendations, achievementsUnlocked } = data;
  const initials = student.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <BackButton
        onClick={openTutorAnalytics}
        label="Kembali ke Analitik"
      />

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
              <p className="text-sm text-muted-foreground truncate">{student.email}</p>
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

      {/* Recommendations */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Rekomendasi Pembelajaran
        </h2>
        <RecommendationsList
          recommendations={recommendations}
          generateButton={
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={isGenerating}
              className="w-full sm:w-auto"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI sedang menganalisis...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Buat Rekomendasi AI
                </>
              )}
            </Button>
          }
        />
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

export default StudentDetailAnalytics;
