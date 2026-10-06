"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNav } from "@/lib/store";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Play,
  Flag,
  FileText,
  Loader2,
  BookOpen,
  Paperclip,
  Download,
  Image,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  colorClasses,
  formatDuration,
  statusLabel,
  statusBadgeClass,
} from "@/lib/ui";
import type { SubjectDTO, LessonDTO, ExerciseDTO, TopicDTO } from "@/lib/types";
import { LoadingGrid, ErrorState } from "@/components/shared/ui";

interface LessonContext {
  subject: SubjectDTO;
  topic: TopicDTO;
  lesson: LessonDTO;
}

function findLessonContext(
  subjects: SubjectDTO[],
  lessonId: string | null
): LessonContext | null {
  if (!lessonId) return null;
  for (const subject of subjects) {
    for (const topic of subject.topics) {
      const lesson = topic.lessons.find((l) => l.id === lessonId);
      if (lesson) return { subject, topic, lesson };
    }
  }
  return null;
}

export function LessonViewer() {
  const selectedLessonId = useNav((s) => s.selectedLessonId);
  const selectedSubjectId = useNav((s) => s.selectedSubjectId);
  const backToSubjects = useNav((s) => s.backToSubjects);
  const backToDashboard = useNav((s) => s.backToDashboard);
  const openExercise = useNav((s) => s.openExercise);
  const openLesson = useNav((s) => s.openLesson);

  // Fetch all subject details so we can resolve a lesson even when
  // selectedSubjectId is null (e.g. opened from "Continue Learning").
  const { data: subjects, isLoading, isError, error } = useQuery({
    queryKey: ["all-subject-details"],
    queryFn: async () => {
      const list = await api.listSubjects();
      const details = await Promise.all(list.map((s) => api.getSubject(s.id)));
      return details;
    },
    enabled: !!selectedLessonId,
  });

  const { data: progressList } = useQuery({
    queryKey: ["progress"],
    queryFn: () => api.getProgress(),
  });

  const ctx = useMemo(
    () => findLessonContext(subjects ?? [], selectedLessonId),
    [subjects, selectedLessonId]
  );

  // Once we resolve the subject from the lesson, sync nav so future
  // back-navigation works correctly.
  useEffect(() => {
    if (ctx && !selectedSubjectId) {
      openLesson(ctx.lesson.id, ctx.subject.id);
    }
  }, [ctx, selectedSubjectId, openLesson]);

  if (isLoading) return <LoadingGrid count={3} />;
  if (isError) return <ErrorState message={error?.message ?? "Gagal memuat pelajaran"} />;
  if (!ctx) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={backToDashboard}
          className="text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Dashboard
        </Button>
        <ErrorState message="Pelajaran tidak ditemukan." />
      </div>
    );
  }

  const { subject, topic, lesson } = ctx;
  const c = colorClasses(subject.color);
  const progressEntry = progressList?.find((p) => p.lessonId === lesson.id);
  const status = progressEntry?.status ?? "NOT_STARTED";
  const completion = progressEntry?.completionPct ?? 0;

  const handleBack = () => {
    if (selectedSubjectId) backToSubjects();
    else backToDashboard();
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="w-4 h-4" />
        {selectedSubjectId ? "Kembali ke Materi" : "Kembali ke Dashboard"}
      </Button>

      <div className="flex items-start gap-3 text-sm text-muted-foreground">
        <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${c.dot}`} />
        <span className="truncate">
          {subject.title}
          <span className="mx-2">›</span>
          {topic.title}
        </span>
      </div>

      <div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            {lesson.title}
          </h1>
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            {lesson.durationMin} menit
          </Badge>
        </div>
        {lesson.summary && (
          <p className="text-muted-foreground mt-2 text-sm lg:text-base">
            {lesson.summary}
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="prose-edu max-w-none">
              <ReactMarkdown>{lesson.content || ""}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <SessionControls
            lessonId={lesson.id}
            status={status}
            completion={completion}
            subjectColor={subject.color}
          />

          {(lesson.attachments ?? []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Paperclip className="w-4 h-4 text-primary" />
                  Materi Lampiran
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(lesson.attachments ?? []).map((a) => {
                    const isImage = a.mimeType.startsWith("image/");
                    const Icon = isImage ? Image : FileText;
                    const sizeKb = a.sizeBytes < 1024 * 1024
                      ? `${(a.sizeBytes / 1024).toFixed(0)} KB`
                      : `${(a.sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
                    return (
                      <li key={a.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.filename}</p>
                          <p className="text-xs text-muted-foreground">{sizeKb}</p>
                        </div>
                        <a
                          href={`/uploads/${a.storedName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
                            <Download className="w-3.5 h-3.5" />
                            Buka
                          </Button>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4 text-primary" />
                Latihan Pelajaran
              </CardTitle>
              <CardDescription>
                Uji pemahamanmu dengan latihan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lesson.exercises.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Belum ada latihan untuk pelajaran ini.
                </p>
              ) : (
                <ul className="space-y-2">
                  {lesson.exercises.map((ex) => (
                    <ExerciseButton
                      key={ex.id}
                      exercise={ex}
                      onClick={() => openExercise(ex.id)}
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ExerciseButton({
  exercise,
  onClick,
}: {
  exercise: ExerciseDTO;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full text-left rounded-lg border p-3 hover:bg-accent/50 transition-colors flex items-center gap-3"
      >
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{exercise.title}</p>
          <p className="text-xs text-muted-foreground">
            {exercise.questions.length} soal · {exercise.type.replace("_", " ")}
          </p>
        </div>
        <ArrowLeft className="w-4 h-4 rotate-180 text-muted-foreground shrink-0" />
      </button>
    </li>
  );
}

function SessionControls({
  lessonId,
  status,
  completion,
  subjectColor,
}: {
  lessonId: string;
  status: string;
  completion: number;
  subjectColor: string;
}) {
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Tick the timer once per second while a session is active.
  useEffect(() => {
    if (!startTime) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const startMutation = useMutation({
    mutationFn: () => api.startSession(lessonId),
    onSuccess: (res) => {
      setSessionId(res.sessionId);
      setStartTime(Date.now());
      setElapsed(0);
      toast.success("Sesi belajar dimulai");
      qc.invalidateQueries({ queryKey: ["student-dashboard"] });
      qc.invalidateQueries({ queryKey: ["progress"] });
    },
    onError: (e: Error) => toast.error(e.message || "Gagal memulai sesi"),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      let id = sessionId;
      let dur = elapsed;
      if (!id) {
        const res = await api.startSession(lessonId);
        id = res.sessionId;
        dur = 0;
      }
      await api.updateSession(id, {
        status: "COMPLETED",
        completionPct: 100,
        durationSec: dur,
      });
    },
    onSuccess: () => {
      toast.success("Pelajaran ditandai selesai 🎉");
      setSessionId(null);
      setStartTime(null);
      setElapsed(0);
      qc.invalidateQueries({ queryKey: ["student-dashboard"] });
      qc.invalidateQueries({ queryKey: ["progress"] });
      qc.invalidateQueries({ queryKey: ["mastery"] });
    },
    onError: (e: Error) => toast.error(e.message || "Gagal menandai selesai"),
    onSettled: () => setSubmitting(false),
  });

  const handleStart = () => startMutation.mutate();
  const handleComplete = () => {
    setSubmitting(true);
    completeMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="w-4 h-4 text-primary" />
          Kontrol Belajar
        </CardTitle>
        <CardDescription>Pantau progress sesi belajar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge className={statusBadgeClass(status)}>{statusLabel(status)}</Badge>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="tabular-nums font-medium">{completion}%</span>
            </div>
            <Progress value={completion} />
          </div>
          {sessionId && (
            <div className="flex items-center justify-between text-sm pt-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Waktu sesi
              </span>
              <span className="tabular-nums font-mono font-medium">
                {formatDuration(elapsed)}
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          {sessionId ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Sesi berjalan…
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full"
              onClick={handleStart}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Mulai Sesi Belajar
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleComplete}
            disabled={submitting || status === "COMPLETED"}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Tandai Selesai
          </Button>
          {status === "COMPLETED" && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center flex items-center justify-center gap-1 pt-1">
              <Flag className="w-3 h-3" />
              Pelajaran sudah selesai
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground pt-1">
          Waktu belajar tercatat otomatis untuk laporan progress kamu.
        </p>
      </CardContent>
    </Card>
  );
}

export default LessonViewer;
