"use client";

// Math Puzzle — 5 logic puzzles with explanations.
// Start screen → per-puzzle flow with feedback + explanation → submit → GameResultScreen.

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Puzzle as PuzzleIcon,
  CheckCircle2,
  XCircle,
  Loader2,
  PlayCircle,
  Lightbulb,
} from "lucide-react";
import { api } from "@/lib/api";
import { useNav } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { LoadingGrid, ErrorState } from "@/components/shared/ui";
import { toast } from "sonner";
import { GameResultScreen } from "./game-result";
import type {
  GameSubmitResult,
  GameSubmitPayload,
  PuzzleDTO,
} from "@/lib/game-types";

type Phase = "loading" | "start" | "playing" | "submitting" | "result";

const PUZZLE_TYPE_LABEL: Record<string, string> = {
  SEQUENCE: "Deret",
  BALANCE: "Keseimbangan",
  MISSING_OPERATOR: "Operator Hilang",
  PATTERN: "Pola",
  WORD_PROBLEM: "Soal Cerita",
};

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: "Mudah",
  MEDIUM: "Sedang",
  HARD: "Sulit",
};

export function MathPuzzleGame() {
  const openGameHub = useNav((s) => s.openGameHub);
  const qc = useQueryClient();

  const [phase, setPhase] = useState<Phase>("loading");
  const [puzzles, setPuzzles] = useState<PuzzleDTO[]>([]);
  const [pIdx, setPIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [result, setResult] = useState<GameSubmitResult | null>(null);
  const startTimeRef = useRef<number>(0);
  const correctRef = useRef(0);

  // Fetch puzzles on mount
  useEffect(() => {
    let mounted = true;
    api
      .getPuzzles(5)
      .then((res) => {
        if (!mounted) return;
        if (res.length === 0) {
          setPuzzles([]);
          setPhase("start");
          return;
        }
        setPuzzles(res);
        setPhase("start");
      })
      .catch((e) => {
        toast.error((e as Error).message || "Gagal memuat puzzle");
        setPhase("start");
      });
    return () => {
      mounted = false;
    };
  }, []);

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

  const startGame = () => {
    setPIdx(0);
    setSelected(null);
    setTextAnswer("");
    setShowFeedback(false);
    setCorrectCount(0);
    correctRef.current = 0;
    startTimeRef.current = Date.now();
    setPhase("playing");
  };

  const currentP = puzzles[pIdx];

  const finishGame = (finalCorrect: number) => {
    setPhase("submitting");
    const durationSec = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const score = finalCorrect * 100;
    const payload: GameSubmitPayload = {
      gameType: "MATH_PUZZLE",
      score,
      correctCount: finalCorrect,
      totalCount: puzzles.length,
      durationSec,
      status: "COMPLETED",
      maxStreak: finalCorrect,
      metadata: {},
    };
    submitMutation.mutate(payload);
  };

  const handleAnswer = (answer: string) => {
    if (showFeedback || !currentP) return;
    setSelected(answer);
    setShowFeedback(true);
    const isCorrect = answer.trim().toLowerCase() === currentP.answer.trim().toLowerCase();
    if (isCorrect) {
      setCorrectCount((c) => {
        const next = c + 1;
        correctRef.current = next;
        return next;
      });
    }

    setTimeout(() => {
      if (pIdx + 1 >= puzzles.length) {
        finishGame(isCorrect ? correctRef.current : correctRef.current);
      } else {
        setPIdx((i) => i + 1);
        setSelected(null);
        setTextAnswer("");
        setShowFeedback(false);
      }
    }, 2500);
  };

  const playAgain = () => {
    setResult(null);
    // refetch fresh puzzles
    api
      .getPuzzles(5)
      .then((res) => {
        setPuzzles(res);
        setPhase("start");
      })
      .catch(() => setPhase("start"));
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

      {phase === "loading" && <LoadingGrid count={2} />}

      {phase === "start" && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 flex items-center justify-center mb-3">
              <PuzzleIcon className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl">Math Puzzle</CardTitle>
            <CardDescription className="text-base">
              Selesaikan 5 teka-teki logika matematika. Setiap puzzle memiliki pembahasan singkat.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {puzzles.length === 0 ? (
              <ErrorState message="Tidak ada puzzle tersedia." />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Jumlah Puzzle</p>
                    <p className="font-bold text-lg">{puzzles.length}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Skor/Benar</p>
                    <p className="font-bold text-lg">100</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Bonus XP</p>
                    <p className="font-bold text-lg">
                      {puzzles.reduce((s, p) => s + p.xpReward, 0)}
                    </p>
                  </div>
                </div>
                <Button onClick={startGame} size="lg" className="w-full">
                  <PlayCircle className="w-5 h-5" />
                  Mulai
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {(phase === "playing" || phase === "submitting") && currentP && (
        <div className="space-y-4">
          {/* Top progress */}
          <div className="flex items-center justify-between gap-3">
            <Badge variant="outline" className="text-sm">
              Puzzle {pIdx + 1}/{puzzles.length}
            </Badge>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {PUZZLE_TYPE_LABEL[currentP.type] ?? currentP.type}
              </Badge>
              <Badge
                className={
                  currentP.difficulty === "HARD"
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    : currentP.difficulty === "MEDIUM"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                }
              >
                {DIFFICULTY_LABEL[currentP.difficulty] ?? currentP.difficulty}
              </Badge>
            </div>
          </div>

          <Progress value={((pIdx + 1) / puzzles.length) * 100} className="h-1.5" />

          {/* Puzzle card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg font-medium leading-snug">
                {currentP.question}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentP.options ? (
                <div className="grid gap-2.5">
                  {currentP.options.map((opt, i) => {
                    const isSelected = selected === opt;
                    const isCorrect =
                      opt.trim().toLowerCase() === currentP.answer.trim().toLowerCase();
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
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Tulis jawabanmu..."
                    value={textAnswer}
                    disabled={showFeedback || phase === "submitting"}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && textAnswer.trim() && !showFeedback) {
                        handleAnswer(textAnswer);
                      }
                    }}
                  />
                  {!showFeedback && (
                    <Button
                      onClick={() => textAnswer.trim() && handleAnswer(textAnswer)}
                      disabled={!textAnswer.trim() || phase === "submitting"}
                      className="w-full"
                    >
                      Kirim Jawaban
                    </Button>
                  )}
                  {showFeedback && (
                    <div
                      className={`flex items-center gap-2 text-sm font-medium ${
                        selected?.trim().toLowerCase() === currentP.answer.trim().toLowerCase()
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-rose-700 dark:text-rose-400"
                      }`}
                    >
                      {selected?.trim().toLowerCase() === currentP.answer.trim().toLowerCase() ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Benar!
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" /> Jawaban: {currentP.answer}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {showFeedback && currentP.explanation && (
                <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="flex items-center gap-1.5 font-medium mb-1">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Pembahasan
                  </p>
                  <p className="text-muted-foreground">{currentP.explanation}</p>
                </div>
              )}

              {phase === "submitting" && (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
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

export default MathPuzzleGame;
