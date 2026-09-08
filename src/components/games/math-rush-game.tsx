"use client";

// Math Rush — fast-paced arithmetic game.
// 60-second countdown, answer as many arithmetic questions as possible.

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Zap,
  CheckCircle2,
  XCircle,
  Flame,
  Loader2,
  PlayCircle,
  Timer,
} from "lucide-react";
import { api } from "@/lib/api";
import { useNav } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { GameResultScreen } from "./game-result";
import type {
  GameSubmitResult,
  GameSubmitPayload,
  MathRushQuestion,
} from "@/lib/game-types";

type Phase = "start" | "playing" | "submitting" | "result";

const TOTAL_DURATION = 60; // seconds, matches backend durationSec

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Mudah",
  medium: "Sedang",
  hard: "Sulit",
};

export function MathRushGame() {
  const openGameHub = useNav((s) => s.openGameHub);
  const qc = useQueryClient();

  const [phase, setPhase] = useState<Phase>("start");
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [questions, setQuestions] = useState<MathRushQuestion[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_DURATION);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [result, setResult] = useState<GameSubmitResult | null>(null);
  const startTimeRef = useRef<number>(0);
  const finalStatsRef = useRef({ correct: 0, wrong: 0, maxStreak: 0 });

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
      toast.error(e.message || "Gagal menyimpan hasil");
      setPhase("playing");
    },
  });

  const startGame = async () => {
    try {
      const res = await api.getMathRush(20, difficulty);
      if (!res.questions || res.questions.length === 0) {
        toast.error("Tidak ada soal Math Rush tersedia.");
        return;
      }
      setQuestions(res.questions);
      setQIdx(0);
      setCorrectCount(0);
      setWrongCount(0);
      setCurrentStreak(0);
      setMaxStreak(0);
      setTimeLeft(TOTAL_DURATION);
      setFlash(null);
      finalStatsRef.current = { correct: 0, wrong: 0, maxStreak: 0 };
      startTimeRef.current = Date.now();
      setPhase("playing");
    } catch (e) {
      toast.error((e as Error).message || "Gagal memuat soal Math Rush");
    }
  };

  const finishGame = () => {
    if (phase === "submitting" || phase === "result") return;
    setPhase("submitting");
    const { correct, maxStreak: ms } = finalStatsRef.current;
    const wrong = finalStatsRef.current.wrong;
    const durationSec = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const score = correct * 50;
    const payload: GameSubmitPayload = {
      gameType: "MATH_RUSH",
      score,
      correctCount: correct,
      totalCount: correct + wrong,
      durationSec,
      status: "COMPLETED",
      maxStreak: ms,
      metadata: { difficulty },
    };
    submitMutation.mutate(payload);
  };

  const currentQ = questions[qIdx];

  const handleAnswer = (option: number) => {
    if (!currentQ || flash || phase !== "playing") return;
    const isCorrect = option === currentQ.answer;
    if (isCorrect) {
      setCorrectCount((c) => {
        const next = c + 1;
        finalStatsRef.current.correct = next;
        return next;
      });
      setCurrentStreak((s) => {
        const next = s + 1;
        setMaxStreak((m) => {
          const nm = Math.max(m, next);
          finalStatsRef.current.maxStreak = nm;
          return nm;
        });
        return next;
      });
      setFlash("correct");
    } else {
      setWrongCount((w) => {
        const next = w + 1;
        finalStatsRef.current.wrong = next;
        return next;
      });
      setCurrentStreak(0);
      setFlash("wrong");
    }
    // brief flash then advance
    setTimeout(() => {
      setFlash(null);
      // If we've exhausted questions, generate more client-side via refetch
      if (qIdx + 1 >= questions.length) {
        // Refetch additional questions silently
        api
          .getMathRush(20, difficulty)
          .then((res) => {
            if (res.questions.length > 0) {
              setQuestions((prev) => [...prev, ...res.questions]);
              setQIdx((i) => i + 1);
            } else {
              finishGame();
            }
          })
          .catch(() => finishGame());
      } else {
        setQIdx((i) => i + 1);
      }
    }, 280);
  };

  // 60-second countdown
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      // Deferred to avoid setState-in-effect lint warning
      const t = setTimeout(() => finishGame(), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  const playAgain = () => {
    setResult(null);
    setPhase("start");
  };

  if (phase === "result" && result) {
    return (
      <GameResultScreen
        result={result}
        onPlayAgain={playAgain}
        onBackToHub={openGameHub}
      />
    );
  }

  const timePct = (timeLeft / TOTAL_DURATION) * 100;

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
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center mb-3">
              <Zap className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl">Math Rush</CardTitle>
            <CardDescription className="text-base">
              Berhitung cepat melawan waktu! Jawab sebanyak mungkin soal dalam 60 detik.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tingkat Kesulitan</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Mudah (+/−)</SelectItem>
                  <SelectItem value="medium">Sedang (+/−/×)</SelectItem>
                  <SelectItem value="hard">Sulit (+/−/×/÷)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Durasi</p>
                <p className="font-bold text-lg">60d</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Skor/Benar</p>
                <p className="font-bold text-lg">50</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Tingkat</p>
                <p className="font-bold text-lg">{DIFFICULTY_LABEL[difficulty]}</p>
              </div>
            </div>
            <Button onClick={startGame} size="lg" className="w-full">
              <PlayCircle className="w-5 h-5" />
              Mulai
            </Button>
          </CardContent>
        </Card>
      )}

      {(phase === "playing" || phase === "submitting") && currentQ && (
        <div className="space-y-4">
          {/* Top stats bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Badge variant="outline" className="text-sm">
              Benar: <span className="font-bold ml-1">{correctCount}</span>
            </Badge>
            <Badge variant="outline" className="text-sm">
              Salah: <span className="font-bold ml-1">{wrongCount}</span>
            </Badge>
            {currentStreak > 1 && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <Flame className="w-3.5 h-3.5" />
                {currentStreak} streak
              </Badge>
            )}
          </div>

          {/* Big timer */}
          <Card
            className={
              timeLeft <= 10
                ? "border-rose-300 dark:border-rose-700"
                : "border-primary/30"
            }
          >
            <CardContent className="p-5 text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <Timer className="w-3.5 h-3.5" />
                Waktu tersisa
              </div>
              <p
                className={`text-6xl sm:text-7xl font-bold tabular-nums ${
                  timeLeft <= 10 ? "text-rose-600 dark:text-rose-400" : "text-primary"
                }`}
              >
                {timeLeft}
              </p>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    timeLeft <= 10 ? "bg-rose-500" : "bg-primary"
                  }`}
                  style={{ width: `${timePct}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Question + options */}
          <Card
            className={
              flash === "correct"
                ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20"
                : flash === "wrong"
                ? "border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20"
                : ""
            }
          >
            <CardContent className="p-6 sm:p-8 text-center">
              <p className="text-3xl sm:text-5xl font-bold tabular-nums mb-6">
                {currentQ.text}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {currentQ.options.map((opt, i) => {
                  let cls =
                    "h-16 sm:h-20 text-2xl sm:text-3xl font-bold border-2 hover:bg-accent/50 transition-colors";
                  if (flash) {
                    if (opt === currentQ.answer) {
                      cls =
                        "h-16 sm:h-20 text-2xl sm:text-3xl font-bold border-2 border-emerald-500 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200";
                    } else if (flash === "wrong") {
                      cls =
                        "h-16 sm:h-20 text-2xl sm:text-3xl font-bold border-2 border-rose-500 bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-200";
                    } else {
                      cls = "h-16 sm:h-20 text-2xl sm:text-3xl font-bold border-2 opacity-50";
                    }
                  }
                  return (
                    <Button
                      key={i}
                      type="button"
                      variant="outline"
                      disabled={!!flash || phase === "submitting"}
                      onClick={() => handleAnswer(opt)}
                      className={cls}
                    >
                      {opt}
                    </Button>
                  );
                })}
              </div>
              {flash && (
                <div className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium">
                  {flash === "correct" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-400">Benar!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span className="text-rose-700 dark:text-rose-400">
                        Jawaban: {currentQ.answer}
                      </span>
                    </>
                  )}
                </div>
              )}
              {phase === "submitting" && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan hasil...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default MathRushGame;
