"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  FileText,
  Target,
} from "lucide-react";
import { api } from "@/lib/api";
import { useNav } from "@/lib/store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { colorClasses } from "@/lib/ui";
import { QuizResult } from "@/components/student/quiz-result";
import type {
  SubjectDTO,
  ExerciseDTO,
  QuestionDTO,
  AttemptResultDTO,
} from "@/lib/types";
import { LoadingGrid, ErrorState } from "@/components/shared/ui";

interface ExerciseContext {
  subject: SubjectDTO;
  exercise: ExerciseDTO;
}

function findExerciseContext(
  subjects: SubjectDTO[],
  exerciseId: string | null
): ExerciseContext | null {
  if (!exerciseId) return null;
  for (const subject of subjects) {
    for (const topic of subject.topics) {
      for (const lesson of topic.lessons) {
        const ex = lesson.exercises.find((e) => e.id === exerciseId);
        if (ex) return { subject, exercise: ex };
      }
    }
  }
  return null;
}

export function ExerciseRunner() {
  const selectedExerciseId = useNav((s) => s.selectedExerciseId);
  const openLesson = useNav((s) => s.openLesson);
  const backToDashboard = useNav((s) => s.backToDashboard);

  const { data: subjects, isLoading, isError, error } = useQuery({
    queryKey: ["all-subject-details"],
    queryFn: async () => {
      const list = await api.listSubjects();
      const details = await Promise.all(list.map((s) => api.getSubject(s.id)));
      return details;
    },
    enabled: !!selectedExerciseId,
  });

  const ctx = useMemo(
    () => findExerciseContext(subjects ?? [], selectedExerciseId),
    [subjects, selectedExerciseId]
  );

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<AttemptResultDTO | null>(null);

  const qc = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!ctx) throw new Error("Latihan tidak ditemukan");
      const payload = ctx.exercise.questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] ?? "",
      }));
      return api.submitExercise(ctx.exercise.id, payload);
    },
    onSuccess: (res) => {
      setResult(res);
      setSubmitted(true);
      qc.invalidateQueries({ queryKey: ["student-dashboard"] });
      qc.invalidateQueries({ queryKey: ["progress"] });
      qc.invalidateQueries({ queryKey: ["mastery"] });
      qc.invalidateQueries({ queryKey: ["student-stats"] });
      if (res.passed) {
        toast.success(`Lulus! Skor ${res.percentage}% · +${res.pointsEarned} poin`);
      } else {
        toast.error(`Belum lulus. Skor ${res.percentage}% (KKM: ${res.kkm})`);
      }
    },
    onError: (e: any) => {
      if (e?.response?.data?.error === "COOLDOWN") {
        const wait = e?.response?.data?.waitSec ?? 300;
        const m = Math.ceil(wait / 60);
        toast.error(`Masih dalam cooldown. Coba lagi dalam ${m} menit.`);
      } else {
        toast.error(e.message || "Gagal mengumpulkan jawaban");
      }
    },
  });

  if (isLoading) return <LoadingGrid count={3} />;
  if (isError) return <ErrorState message={error?.message ?? "Gagal memuat latihan"} />;
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
        <ErrorState message="Latihan tidak ditemukan." />
      </div>
    );
  }

  const { subject, exercise } = ctx;
  const c = colorClasses(subject.color);
  const questions = [...exercise.questions].sort((a, b) => a.order - b.order);

  const allAnswered = questions.every((q) => (answers[q.id] ?? "").trim() !== "");

  const handleSubmit = () => {
    if (!allAnswered) {
      toast.error("Mohon jawab semua soal terlebih dahulu");
      return;
    }
    submitMutation.mutate();
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
    setResult(null);
  };

  const handleBackToLesson = () => {
    openLesson(exercise.lessonId, subject.id);
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBackToLesson}
        className="text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Pelajaran
      </Button>

      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>
          <FileText className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
              {exercise.title}
            </h1>
            <Badge variant="outline">{exercise.type.replace("_", " ")}</Badge>
            {(exercise as any).quizType && (exercise as any).quizType !== "REGULAR" && (
              <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                {(exercise as any).quizType}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
            {questions.length} soal · {subject.title}
            {(exercise as any).kkm && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                <Target className="w-3 h-3" /> KKM {(exercise as any).kkm}
              </span>
            )}
          </p>
        </div>
      </div>

      {submitted && result ? (
        <QuizResult
          result={result}
          exerciseTitle={exercise.title}
          onRetry={handleReset}
          onNext={handleBackToLesson}
          onBack={handleBackToLesson}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Soal Latihan</CardTitle>
            <CardDescription>
              Jawab semua soal, lalu kumpulkan untuk melihat hasilnya.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={idx}
                exerciseType={exercise.type}
                answer={answers[q.id] ?? ""}
                onChange={(v) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: v }))
                }
              />
            ))}
            <Separator />
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {Object.values(answers).filter((v) => v?.trim()).length}/
                {questions.length} soal terjawab
              </p>
              <Button
                onClick={handleSubmit}
                disabled={!allAnswered || submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Kumpulkan Jawaban
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  index,
  exerciseType,
  answer,
  onChange,
}: {
  question: QuestionDTO;
  index: number;
  exerciseType: string;
  answer: string;
  onChange: (v: string) => void;
}) {
  const isMCQ = question.options && question.options.length > 0;
  const isTrueFalse = !isMCQ && exerciseType === "TRUE_FALSE";
  const tfOptions = ["Benar", "Salah"];

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
          {index + 1}
        </div>
        <p className="font-medium pt-0.5">{question.text}</p>
      </div>

      <div className="pl-10">
        {isMCQ ? (
          <RadioGroup value={answer} onValueChange={onChange}>
            {question.options!.map((opt, i) => (
              <label
                key={i}
                className="flex items-center gap-2.5 rounded-md border p-2.5 cursor-pointer hover:bg-accent/50 transition-colors has-[:checked]:bg-accent"
              >
                <RadioGroupItem value={opt} id={`${question.id}-${i}`} />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </RadioGroup>
        ) : isTrueFalse ? (
          <RadioGroup value={answer} onValueChange={onChange}>
            {tfOptions.map((opt, i) => (
              <label
                key={i}
                className="flex items-center gap-2.5 rounded-md border p-2.5 cursor-pointer hover:bg-accent/50 transition-colors has-[:checked]:bg-accent"
              >
                <RadioGroupItem value={opt} id={`${question.id}-${i}`} />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </RadioGroup>
        ) : (
          <Input
            placeholder="Tulis jawabanmu…"
            value={answer}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

export default ExerciseRunner;
