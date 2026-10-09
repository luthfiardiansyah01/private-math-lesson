"use client";

import { useState, useEffect } from "react";
import {
  Trophy, AlertCircle, Star, Zap, Clock, RotateCcw,
  CheckCircle2, XCircle, TrendingUp, TrendingDown, Flame,
  PartyPopper, BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { AttemptResultDTO } from "@/lib/types";

interface QuizResultProps {
  result: AttemptResultDTO;
  exerciseTitle: string;
  onRetry: () => void;
  onNext: () => void;       // lanjut ke Pengayaan / Remedial
  onBack: () => void;
  cooldownSec?: number;     // detik sisa cooldown jika ada
}

function useCountdown(initSec: number) {
  const [sec, setSec] = useState(initSec);
  useEffect(() => {
    if (sec <= 0) return;
    const t = setInterval(() => setSec((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, []);
  return sec;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function QuizResult({ result, exerciseTitle, onRetry, onNext, onBack, cooldownSec = 0 }: QuizResultProps) {
  const countdown = useCountdown(cooldownSec);
  const [showDetails, setShowDetails] = useState(false);

  const { passed, percentage, kkm, routedTo, pointsEarned, attemptNo, bonusMultiplier, details } = result;

  const correctCount = details.filter((d) => d.correct).length;
  const totalCount = details.length;

  const isPengayaan = routedTo === "PENGAYAAN";
  const isRemedial = routedTo === "REMEDIAL";
  const isPerfect = percentage === 100;
  const isRetry = attemptNo > 1;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* Header Result Card */}
      <Card className={`border-2 ${isPengayaan ? "border-violet-400 dark:border-violet-600" : "border-orange-400 dark:border-orange-600"}`}>
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col items-center text-center gap-3">

            {/* Ikon status */}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white ${
              isPengayaan
                ? isPerfect ? "bg-amber-500" : "bg-violet-600"
                : "bg-orange-500"
            }`}>
              {isPengayaan
                ? isPerfect
                  ? <PartyPopper className="w-10 h-10" />
                  : <Trophy className="w-10 h-10" />
                : <AlertCircle className="w-10 h-10" />
              }
            </div>

            {/* Label routing */}
            <div>
              <Badge className={`text-sm px-3 py-1 ${
                isPengayaan
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                  : "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
              }`}>
                {isPengayaan ? (
                  <><TrendingUp className="w-3.5 h-3.5 mr-1" /> Lanjut ke Pengayaan</>
                ) : (
                  <><TrendingDown className="w-3.5 h-3.5 mr-1" /> Perlu Remedial</>
                )}
              </Badge>
            </div>

            <div>
              <h2 className="text-2xl font-bold">
                {isPengayaan
                  ? isPerfect ? "Sempurna! 🎉" : "Kamu Lulus!"
                  : "Belum Lulus"}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">{exerciseTitle}</p>
            </div>

            {/* Skor besar */}
            <div className="flex items-end gap-1">
              <span className="text-5xl font-extrabold">{percentage}</span>
              <span className="text-2xl font-bold text-muted-foreground mb-1">%</span>
            </div>

            {/* Progress bar dengan KKM marker */}
            <div className="w-full space-y-1.5">
              <Progress
                value={percentage}
                className={`h-3 ${isPengayaan ? "[&>div]:bg-violet-500" : "[&>div]:bg-orange-500"}`}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span className="font-medium text-foreground">KKM: {kkm}</span>
                <span>100</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 w-full mt-1">
              <div className="rounded-lg bg-muted/60 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Benar</p>
                <p className="font-bold text-lg text-emerald-600">{correctCount}/{totalCount}</p>
              </div>
              <div className="rounded-lg bg-muted/60 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Percobaan</p>
                <p className="font-bold text-lg">#{attemptNo}</p>
              </div>
              <div className="rounded-lg bg-muted/60 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Poin</p>
                <p className={`font-bold text-lg ${pointsEarned > 0 ? "text-violet-600" : "text-orange-500"}`}>
                  +{pointsEarned}
                </p>
              </div>
            </div>

            {/* Bonus/penalty label */}
            {bonusMultiplier !== 1 && (
              <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
                bonusMultiplier > 1
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
              }`}>
                {bonusMultiplier > 1
                  ? <><Star className="w-3.5 h-3.5" /> Bonus ×{bonusMultiplier} aktif!</>
                  : <><Zap className="w-3.5 h-3.5" /> Penalti ×{bonusMultiplier} (poin berkurang)</>
                }
              </div>
            )}

            {/* Streak bonus indicator */}
            {isPerfect && (
              <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <Flame className="w-3.5 h-3.5" /> Perfect Score! Bonus ×2 poin
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pesan motivasi */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className={`flex items-start gap-3 ${isPengayaan ? "text-violet-700 dark:text-violet-300" : "text-orange-700 dark:text-orange-300"}`}>
            {isPengayaan
              ? <BookOpen className="w-5 h-5 mt-0.5 shrink-0" />
              : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            }
            <div className="text-sm">
              {isPengayaan ? (
                <>
                  <p className="font-semibold mb-0.5">Kerja bagus! Nilai kamu di atas KKM ({kkm}).</p>
                  <p className="text-muted-foreground">
                    Kamu siap ke soal <strong>Pengayaan</strong> — level lebih menantang untuk memperdalam pemahaman.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold mb-0.5">Nilai kamu di bawah KKM ({kkm}).</p>
                  <p className="text-muted-foreground">
                    Jangan menyerah! Kerjakan soal <strong>Remedial</strong> untuk memperkuat materi yang belum dikuasai.
                    {countdown > 0 && <> Kamu bisa coba lagi dalam <strong>{formatTime(countdown)}</strong>.</>}
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tombol aksi */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Kembali
        </Button>
        {isRemedial && countdown > 0 && (
          <Button variant="outline" disabled className="flex-1">
            <Clock className="w-4 h-4 mr-1" />
            Ulangi ({formatTime(countdown)})
          </Button>
        )}
        {isRemedial && countdown === 0 && (
          <Button variant="outline" onClick={onRetry} className="flex-1">
            <RotateCcw className="w-4 h-4 mr-1" />
            Ulangi Latihan
          </Button>
        )}
        <Button onClick={onNext} className="flex-1">
          {isPengayaan ? (
            <><TrendingUp className="w-4 h-4 mr-1" /> Mulai Pengayaan</>
          ) : (
            <><BookOpen className="w-4 h-4 mr-1" /> Mulai Remedial</>
          )}
        </Button>
      </div>

      {/* Detail soal (toggle) */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDetails(!showDetails)}
        className="w-full text-muted-foreground"
      >
        {showDetails ? "Sembunyikan" : "Lihat"} Detail Jawaban
      </Button>

      {showDetails && (
        <div className="space-y-3">
          {details.map((d, i) => (
            <Card key={d.questionId} className={`border ${d.correct ? "border-emerald-200 dark:border-emerald-800" : "border-rose-200 dark:border-rose-800"}`}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start gap-2">
                  {d.correct
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    : <XCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  }
                  <div className="text-sm flex-1 min-w-0">
                    <p className="font-medium">Soal {i + 1}</p>
                    {!d.correct && (
                      <>
                        <p className="text-rose-600 dark:text-rose-400 text-xs mt-1">
                          Jawaban kamu: {d.yourAnswer || "(tidak dijawab)"}
                        </p>
                        <p className="text-emerald-600 dark:text-emerald-400 text-xs">
                          Jawaban benar: {d.correctAnswer}
                        </p>
                      </>
                    )}
                    {d.explanation && (
                      <p className="text-muted-foreground text-xs mt-1.5 italic">{d.explanation}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
