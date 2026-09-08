"use client";

// Interactive Quiz — fetches 10 MCQ questions from the existing Phase-1 Question pool.
// Start screen → per-question flow with countdown timer → submit → GameResultScreen.

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  XCircle,
  Clock,
  Flame,
  Loader2,
  PlayCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useNav } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingGrid, ErrorState } from "@/components/shared/ui";
import { toast } from "sonner";
import { GameResultScreen } from "./game-result";
import type { GameSubmitResult, GameSubmitPayload } from "@/lib/game-types";

type Phase = "start" | "playing" | "submitting" | "result";

interface QuizQuestion {
  id: string;
  text: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string | null;
  subjectTitle: string;
  subjectColor: string;
}

export function QuizGame() {
  const openGameHub = useNav((s) => s.openGameHub);
  const qc = useQueryClient();

  const [phase, setPhase] = useState<Phase>("start");
  const [subjectId, setSubjectId] = useState<string>("all");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [durationPerQ, setDurationPerQ] = useState(30);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [result, setResult] = useState<GameSubmitResult | null>(null);
  const startTimeRef = useRef<number>(0);

  // Subjects list for the optional filter
  const { data: subjects } = useQuery({
    queryKey: ["subjects-list"],
    queryFn: () => api.listSubjects(),
  });

  const fetchQuestions = async () => {
    const idArg = subjectId === "all" ? undefined : subjectId;
    const res = await api.getQuizQuestions(idArg, 10);
    return res;
  };

  const startQuiz = async () => {
    try {
      const res = await fetchQuestions();
      if (!res.questions || res.questions.length === 0) {
        toast.error("Tidak ada soal kuis tersedia untuk filter ini.");
        return;
      }
      setQuestions(res.questions);
      setDurationPerQ(res.durationPerQuestionSec || 30);
      setCurrentIdx(0);
      setSelected(null);
      setShowFeedback(false);
      setCorrectCount(0);
      setCurrentStreak(0);
      setMaxStreak(0);
      setTimeLeft(res.durationPerQuestionSec || 30);
      startTimeRef.current = Date.now();
      setPhase("playing");
    } catch (e) {
      toast.error((e as Error).message || "Gagal memuat soal kuis");
    }
  };

  const submitMutation = useMutation({
    mutationFn: (payload: GameSubmitPayload) => api.submitGame(payload),
    onSuccess: (res) => {
      setResult(res);
      setPhase("result");
      qc.invalidateQueries({ queryKey: ["game-hub"] });
      qc.invalidateQueries({ queryKey: ["student-stats"] });
      qc.invalidateQueries({ queryKey: ["gamified-dashboard"] });
      qc.invalidateQueries({ queryKey: ["student-dashboard"] });
      qc.invalidateQueries({ queryKey: ["achievements"] });
      qc.invalidateQueries({ queryKey: ["game-history"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Gagal menyimpan hasil kuis");
      setPhase("playing");
    },
  });

  const finishQuiz = (finalCorrect: number, finalMaxStreak: number) => {
    setPhase("submitting");
    const durationSec = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const score = finalCorrect * 100;
    const meta = questions[0]
      ? {
          subjectTitle: questions[0].subjectTitle,
          subjectColor: questions[0].subjectColor,
          maxStreak: finalMaxStreak,
        }
      : { maxStreak: finalMaxStreak };
    const payload: GameSubmitPayload = {
      gameType: "QUIZ",
      score,
      correctCount: finalCorrect,
      totalCount: questions.length,
      durationSec,
      status: "COMPLETED",
      maxStreak: finalMaxStreak,
      metadata: meta,
    };
    if (subjectId !== "all") payload.metadata = { ...payload.metadata, subjectId };
    submitMutation.mutate(payload);
  };

  const currentQ = questions[currentIdx];

  const handleAnswer = (option: string | null, timedOut = false) => {
    if (showFeedback || !currentQ) return;
    setSelected(option);
    setShowFeedback(true);

    const isCorrect = !timedOut && option === currentQ.correctAnswer;
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      setCurrentStreak((s) => {
        const next = s + 1;
        setMaxStreak((m) => Math.max(m, next));
        return next;
      });
    } else {
      setCurrentStreak(0);
    }

    // Advance after showing feedback for 1.5s
    setTimeout(() => {
      if (currentIdx + 1 >= questions.length) {
        finishQuiz(
          isCorrect ? correctCount + 1 : correctCount,
          Math.max(maxStreak, isCorrect ? currentStreak + 1 : currentStreak)
        );
      } else {
        setCurrentIdx((i) => i + 1);
        setSelected(null);
        setShowFeedback(false);
        setTimeLeft(durationPerQ);
      }
    }, 1500);
  };

  // Per-question countdown timer
  useEffect(() => {
    if (phase !== "playing" || showFeedback) return;
    if (timeLeft <= 0) {
      // Time up → mark wrong, advance (deferred to avoid setState-in-effect)
      const t = setTimeout(() => handleAnswer(null, true), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, showFeedback, timeLeft]);

  const playAgain = () => {
    setResult(null);
    setPhase("start");
  };

  // ---- Render phases ----
  if (phase === "result" && result) {
    return (
      <GameResultScreen
        result={result}
        onPlayAgain={playAgain}
        onBackToHub={openGameHub}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={openGameHub}
        className="text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Game Hub
      </Button>

      {phase === "start" && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-3">
              <Brain className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl">Interactive Quiz</CardTitle>
            <CardDescription className="text-base">
              10 soal pilihan ganda dari materi pelajaran. Setiap soal punya timer — kerjakan secepat mungkin!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pilih Mata Pelajaran (opsional)</label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua mata pelajaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua mata pelajaran</SelectItem>
                  {subjects?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Jumlah Soal</p>
                <p className="font-bold text-lg">10</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Waktu/Soal</p>
                <p className="font-bold text-lg">30d</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Skor Maks</p>
                <p className="font-bold text-lg">1000</p>
              </div>
            </div>
            <Button onClick={startQuiz} size="lg" className="w-full">
              <PlayCircle className="w-5 h-5" />
              Mulai Kuis
            </Button>
          </CardContent>
        </Card>
      )}

      {(phase === "playing" || phase === "submitting") && currentQ && (
        <div className="space-y-4">
          {/* Top stats bar */}
          <div className="flex items-center justify-between gap-3">
            <Badge variant="outline" className="text-sm">
              Soal {currentIdx + 1}/{questions.length}
            </Badge>
            <div className="flex items-center gap-2">
              {currentStreak > 1 && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <Flame className="w-3.5 h-3.5" />
                  {currentStreak} streak
                </Badge>
              )}
              <Badge
                className={
                  timeLeft <= 5
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                }
              >
                <Clock className="w-3.5 h-3.5" />
                {timeLeft}d
              </Badge>
            </div>
          </div>

          <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-1.5" />

          {/* Question card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {currentQ.subjectTitle}
                </Badge>
              </div>
              <CardTitle className="text-lg sm:text-xl font-medium leading-snug pt-1">
                {currentQ.text}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2.5">
              {(currentQ.options ?? []).map((opt, i) => {
                const isSelected = selected === opt;
                const isCorrect = opt === currentQ.correctAnswer;
                let cls =
                  "justify-start text-left border hover:bg-accent/50 transition-colors";
                if (showFeedback) {
                  if (isCorrect) {
                    cls =
                      "justify-start text-left border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40";
                  } else if (isSelected) {
                    cls =
                      "justify-start text-left border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/40";
                  } else {
                    cls = "justify-start text-left border opacity-60";
                  }
                }
                return (
                  <Button
                    key={i}
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={showFeedback || phase === "submitting"}
                    onClick={() => handleAnswer(opt)}
                    className={cls}
                  >
                    <span className="w-7 h-7 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {showFeedback && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    {showFeedback && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                  </Button>
                );
              })}

              {showFeedback && currentQ.explanation && (
                <div className="mt-2 rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="font-medium mb-1">Pembahasan</p>
                  <p className="text-muted-foreground">{currentQ.explanation}</p>
                </div>
              )}

              {phase === "submitting" && (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan hasil...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading + error fallthrough */}
      {!currentQ && phase === "playing" && <LoadingGrid count={3} />}
    </div>
  );
}

export default QuizGame;
