"use client";

// Shared end-of-game result screen used by all 4 games.
// Receives a GameSubmitResult from the API and renders a celebratory summary.

import { motion } from "framer-motion";
import { Sparkles, Trophy, RotateCcw, Home, Star, Zap, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { gameAchievementIcon } from "./game-icons";
import { formatRelative } from "@/lib/ui";
import type { GameSubmitResult } from "@/lib/game-types";

export function GameResultScreen({
  result,
  onPlayAgain,
  onBackToHub,
}: {
  result: GameSubmitResult;
  onPlayAgain: () => void;
  onBackToHub: () => void;
}) {
  const { xpEarned, newStats, leveledUp, newLevel, newAchievements, gameSession } = result;
  const celebrate = leveledUp || newAchievements.length > 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {celebrate && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center text-5xl sm:text-6xl select-none"
          aria-hidden
        >
          {"🎉".repeat(Math.min(5, 1 + newAchievements.length + (leveledUp ? 1 : 0)))}
        </motion.div>
      )}

      {/* XP earned hero card */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40">
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 mb-3">
            <Zap className="w-7 h-7" />
          </div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
            XP Didapat
          </p>
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="text-5xl sm:text-6xl font-bold text-emerald-700 dark:text-emerald-300 mt-1 tabular-nums"
          >
            +{xpEarned}
          </motion.p>
          <div className="flex items-center justify-center gap-3 mt-4 text-sm text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <Star className="w-4 h-4" />
              Skor <span className="font-semibold text-foreground">{gameSession.score}</span>
            </span>
            <span className="text-border">·</span>
            <span>
              Benar{" "}
              <span className="font-semibold text-foreground">
                {gameSession.correctCount}/{gameSession.totalCount}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Level up banner */}
      {leveledUp && newLevel != null && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                  Level Up!
                </p>
                <p className="text-xl font-bold text-amber-800 dark:text-amber-200">
                  Mencapai Level {newLevel} 🏆
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* New achievements */}
      {newAchievements.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Lencana Baru Terbuka
          </h3>
          <div className="space-y-2">
            {newAchievements.map((a) => {
              const Icon = gameAchievementIcon(a.icon);
              return (
                <motion.div
                  key={a.code}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                >
                  <Card className="border-primary/30">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.description}</p>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        +{a.xpReward} XP
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* New stats summary */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Level Sekarang</p>
              <p className="text-2xl font-bold tabular-nums">{newStats.level}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total XP</p>
              <p className="text-2xl font-bold tabular-nums">{newStats.totalXP}</p>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>
                {newStats.xpIntoLevel} / {newStats.xpForNextLevel} XP
              </span>
              <span>menuju Level {newStats.level + 1}</span>
            </div>
            <Progress value={newStats.levelProgressPct} className="h-2.5" />
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
                <Flame className="w-4 h-4" />
                <span className="font-bold tabular-nums">{newStats.currentStreak}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Streak</p>
            </div>
            <div className="text-center">
              <div className="font-bold tabular-nums">{newStats.gamesPlayed}</div>
              <p className="text-xs text-muted-foreground mt-0.5">Game</p>
            </div>
            <div className="text-center">
              <div className="font-bold tabular-nums">{newStats.bossesDefeated}</div>
              <p className="text-xs text-muted-foreground mt-0.5">Boss</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Button onClick={onPlayAgain} size="lg">
          <RotateCcw className="w-4 h-4" />
          Main Lagi
        </Button>
        <Button onClick={onBackToHub} variant="outline" size="lg">
          <Home className="w-4 h-4" />
          Kembali ke Game Hub
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Dicatat {formatRelative(gameSession.createdAt)}
      </p>
    </div>
  );
}
