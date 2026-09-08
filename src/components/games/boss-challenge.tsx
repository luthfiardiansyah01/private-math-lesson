"use client";

// Boss Challenge — student (100 HP) vs boss (hp HP).
// Reads selectedBossId from nav store; falls back to a boss selection grid if none selected.
// On answer: correct → boss takes damage; wrong → student takes damage.

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Sword,
  Shield,
  Heart,
  CheckCircle2,
  XCircle,
  Loader2,
  Skull,
  Trophy,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useNav } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingGrid, ErrorState, EmptyState } from "@/components/shared/ui";
import { bossIcon } from "./game-icons";
import { GameResultScreen } from "./game-result";
import { colorClasses } from "@/lib/ui";
import { toast } from "sonner";
import type {
  BossDTO,
  GameSubmitResult,
  GameSubmitPayload,
} from "@/lib/game-types";

type Phase = "battle" | "ended" | "submitting" | "result";

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: "Mudah",
  MEDIUM: "Sedang",
  HARD: "Sulit",
};

const STUDENT_MAX_HP = 100;

export function BossChallenge() {
  const selectedBossId = useNav((s) => s.selectedBossId);
  const openBoss = useNav((s) => s.openBoss);
  const openGameHub = useNav((s) => s.openGameHub);
  const qc = useQueryClient();

  // Boss list (when no boss selected yet)
  const {
    data: bossList,
    isLoading: listLoading,
    isError: listError,
    error: listErr,
  } = useQuery({
    queryKey: ["bosses"],
    queryFn: () => api.getBosses(),
    enabled: !selectedBossId,
  });

  // Selected boss detail
  const {
    data: boss,
    isLoading: bossLoading,
    isError: bossError,
    error: bossErr,
  } = useQuery({
    queryKey: ["boss", selectedBossId],
    queryFn: () => api.getBoss(selectedBossId!),
    enabled: !!selectedBossId,
  });

  const [phase, setPhase] = useState<Phase>("battle");
  const [bossHp, setBossHp] = useState(0);
  const [studentHp, setStudentHp] = useState(STUDENT_MAX_HP);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [outcome, setOutcome] = useState<"victory" | "defeat" | null>(null);
  const [result, setResult] = useState<GameSubmitResult | null>(null);
  const [bossShake, setBossShake] = useState(false);
  const [studentShake, setStudentShake] = useState(false);
  const startTimeRef = useRef<number>(0);

  // Initialize battle when boss loaded
  useEffect(() => {
    if (boss && phase === "battle" && bossHp === 0 && studentHp === STUDENT_MAX_HP) {
      setBossHp(boss.hp);
      setStudentHp(STUDENT_MAX_HP);
      setQIdx(0);
      setSelected(null);
      setShowFeedback(false);
      setCorrectCount(0);
      setCurrentStreak(0);
      setMaxStreak(0);
      setOutcome(null);
      startTimeRef.current = Date.now();
    }
  }, [boss]);

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
      qc.invalidateQueries({ queryKey: ["bosses"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Gagal menyimpan hasil");
      setPhase("battle");
    },
  });

  const finalize = (
    outcomeType: "victory" | "defeat",
    finalCorrect: number,
    finalMaxStreak: number,
    finalStudentHp: number,
    finalBossHp: number,
    questionsAnswered: number
  ) => {
    if (!boss) return;
    setPhase("submitting");
    const durationSec = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const isVictory = outcomeType === "victory";
    const score = isVictory ? 500 + finalStudentHp : finalCorrect * 50;
    const payload: GameSubmitPayload = {
      gameType: "BOSS_CHALLENGE",
      score,
      correctCount: finalCorrect,
      totalCount: questionsAnswered,
      durationSec,
      status: isVictory ? "COMPLETED" : "FAILED",
      maxStreak: finalMaxStreak,
      metadata: {
        bossId: boss.id,
        bossName: boss.name,
        difficulty: boss.difficulty,
        studentHpLeft: Math.max(0, finalStudentHp),
        bossDefeated: isVictory,
        maxStreak: finalMaxStreak,
      },
    };
    submitMutation.mutate(payload);
  };

  const currentQ = boss?.questions[qIdx];

  const handleAnswer = (option: string) => {
    if (!boss || !currentQ || showFeedback || phase !== "battle") return;
    setSelected(option);
    setShowFeedback(true);
    const isCorrect = option === currentQ.correctAnswer;

    let nextCorrect = correctCount;
    let nextStreak = currentStreak;
    let nextMaxStreak = maxStreak;

    if (isCorrect) {
      nextCorrect += 1;
      nextStreak += 1;
      nextMaxStreak = Math.max(maxStreak, nextStreak);
      setCorrectCount(nextCorrect);
      setCurrentStreak(nextStreak);
      setMaxStreak(nextMaxStreak);
      // Boss takes damage
      const dmgPerHit = Math.ceil(boss.hp / boss.questions.length);
      const newBossHp = Math.max(0, bossHp - dmgPerHit);
      setBossHp(newBossHp);
      setBossShake(true);
      setTimeout(() => setBossShake(false), 400);
      if (newBossHp <= 0) {
        // Victory!
        setOutcome("victory");
        setTimeout(() => {
          finalize("victory", nextCorrect, nextMaxStreak, studentHp, 0, qIdx + 1);
          setPhase("ended");
        }, 1500);
        return;
      }
    } else {
      nextStreak = 0;
      setCurrentStreak(0);
      // Student takes damage
      const newStudentHp = Math.max(0, studentHp - boss.attack);
      setStudentHp(newStudentHp);
      setStudentShake(true);
      setTimeout(() => setStudentShake(false), 400);
      if (newStudentHp <= 0) {
        // Defeat
        setOutcome("defeat");
        setTimeout(() => {
          finalize("defeat", nextCorrect, nextMaxStreak, 0, bossHp, qIdx + 1);
          setPhase("ended");
        }, 1500);
        return;
      }
    }

    // Advance after showing feedback
    setTimeout(() => {
      if (qIdx + 1 >= boss.questions.length) {
        // Out of questions → check final state
        if (bossHp > 0 && studentHp > 0) {
          // Boss not defeated → defeat
          setOutcome("defeat");
          finalize("defeat", nextCorrect, nextMaxStreak, studentHp, bossHp, qIdx + 1);
          setPhase("ended");
        }
      } else {
        setQIdx((i) => i + 1);
        setSelected(null);
        setShowFeedback(false);
      }
    }, 2000);
  };

  const playAgain = () => {
    setResult(null);
    setOutcome(null);
    setPhase("battle");
    // Reset state — will be re-initialized by useEffect when boss reloads (already cached)
    setBossHp(0);
    setStudentHp(STUDENT_MAX_HP);
    setQIdx(0);
    setSelected(null);
    setShowFeedback(false);
    setCorrectCount(0);
    setCurrentStreak(0);
    setMaxStreak(0);
    startTimeRef.current = Date.now();
    if (boss) setBossHp(boss.hp);
  };

  // Result screen
  if (phase === "result" && result) {
    return (
      <GameResultScreen
        result={result}
        onPlayAgain={playAgain}
        onBackToHub={openGameHub}
      />
    );
  }

  // ---- No boss selected: boss selection grid ----
  if (!selectedBossId) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={openGameHub}
          className="text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Game Hub
        </Button>

        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Boss Challenge</h1>
          <p className="text-muted-foreground mt-1 text-sm lg:text-base">
            Pilih boss yang ingin kamu tantang. Setiap jawaban benar mengurangi HP boss!
          </p>
        </div>

        {listLoading && <LoadingGrid count={3} />}
        {listError && <ErrorState message={listErr?.message ?? "Gagal memuat daftar boss"} />}
        {bossList && bossList.length === 0 && (
          <EmptyState icon={Skull} title="Belum ada boss tersedia" description="Boss akan segera hadir!" />
        )}
        {bossList && bossList.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bossList.map((b: BossDTO) => {
              const Icon = bossIcon(b.icon);
              const c = colorClasses(b.color);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => openBoss(b.id)}
                  className={`group text-left rounded-xl border ${c.border} bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-lg ${c.bg} ${c.text} flex items-center justify-center shrink-0`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold truncate">{b.name}</h3>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className={`text-xs ${c.text} mt-0.5 line-clamp-2`}>{b.description}</p>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {DIFFICULTY_LABEL[b.difficulty] ?? b.difficulty}
                        </Badge>
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Heart className="w-3 h-3" /> {b.hp}
                        </span>
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Sword className="w-3 h-3" /> {b.attack}
                        </span>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs mt-2">
                        +{b.rewardXP} XP
                      </Badge>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---- Boss loading / error ----
  if (bossLoading) return <LoadingGrid count={3} />;
  if (bossError) return <ErrorState message={bossErr?.message ?? "Gagal memuat boss"} />;
  if (!boss) return <ErrorState message="Boss tidak ditemukan" />;

  const c = colorClasses(boss.color);
  const BossIcon = bossIcon(boss.icon);
  const bossHpPct = boss.hp > 0 ? (bossHp / boss.hp) * 100 : 0;
  const studentHpPct = (studentHp / STUDENT_MAX_HP) * 100;

  // ---- End screen (between battle and result) ----
  if (phase === "ended" && outcome) {
    const isVictory = outcome === "victory";
    return (
      <div className="space-y-6 max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <div
            className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-4 ${
              isVictory
                ? "bg-emerald-100 dark:bg-emerald-950"
                : "bg-rose-100 dark:bg-rose-950"
            }`}
          >
            {isVictory ? "🏆" : "💀"}
          </div>
          <h1
            className={`text-4xl sm:text-5xl font-bold ${
              isVictory
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-rose-700 dark:text-rose-300"
            }`}
          >
            {isVictory ? "VICTORY!" : "DEFEAT"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isVictory
              ? `${boss.name} telah dikalahkan! 🎉`
              : `Kamu kalah dari ${boss.name}. Coba lagi!`}
          </p>
        </motion.div>
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Menyimpan hasil...
        </div>
      </div>
    );
  }

  // ---- Battle screen ----
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

      {/* Battle stats: Boss vs Student */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Boss */}
        <motion.div animate={bossShake ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}>
          <Card className={`border-2 ${bossShake ? "border-rose-400" : c.border}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-xl ${c.bg} ${c.text} flex items-center justify-center shrink-0`}>
                  <BossIcon className="w-8 h-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold truncate">{boss.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {DIFFICULTY_LABEL[boss.difficulty] ?? boss.difficulty}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-rose-500 transition-all"
                        style={{ width: `${bossHpPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold tabular-nums w-14 text-right">
                      {bossHp}/{boss.hp}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Serangan: <span className="font-semibold text-rose-600 dark:text-rose-400">{boss.attack}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Student */}
        <motion.div animate={studentShake ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}>
          <Card className={`border-2 ${studentShake ? "border-rose-400" : "border-emerald-300 dark:border-emerald-700"}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <Shield className="w-8 h-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold">Siswa</h3>
                    {currentStreak > 1 && (
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-xs">
                        {currentStreak} streak
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Heart className="w-3.5 h-3.5 text-emerald-500" />
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${studentHpPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold tabular-nums w-14 text-right">
                      {studentHp}/{STUDENT_MAX_HP}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Benar: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{correctCount}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Current question */}
      {currentQ && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="text-xs">
                Soal {qIdx + 1}/{boss.questions.length}
              </Badge>
              {phase === "submitting" && (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Menyimpan...
                </span>
              )}
            </div>
            <CardTitle className="text-base sm:text-lg font-medium leading-snug pt-1">
              {currentQ.text}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2.5">
            {currentQ.options.map((opt, i) => {
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
          </CardContent>
        </Card>
      )}

      {/* Reward hint */}
      <div className="text-center text-sm text-muted-foreground">
        <Trophy className="w-4 h-4 inline-block mr-1 text-amber-500" />
        Hadiah: <span className="font-semibold text-foreground">+{boss.rewardXP} XP</span> jika menang
      </div>
    </div>
  );
}

export default BossChallenge;
