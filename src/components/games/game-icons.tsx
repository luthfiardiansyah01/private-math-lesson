"use client";

// Centralized icon mapping helpers for the gamification feature.
// Achievement `icon` is a string name coming from the API; we map it to a Lucide component.
// Note: lucide-react does not export `Dragon` or `Ogre`, so we substitute `Flame`/`Bug`.

import {
  Trophy,
  Flame,
  Footprints,
  Gamepad2,
  Joystick,
  Star,
  Brain,
  Zap,
  Rocket,
  Puzzle,
  Lightbulb,
  Sword,
  Crosshair,
  Shield,
  TrendingUp,
  Target,
  Award,
  Medal,
  Crown,
  Sparkles,
  Skull,
  Ghost,
  Mountain,
  Bug,
  type LucideIcon,
} from "lucide-react";

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  Trophy,
  Flame,
  Footprints,
  Gamepad2,
  Joystick,
  Star,
  Brain,
  Zap,
  Rocket,
  Puzzle,
  Lightbulb,
  Sword,
  Crosshair,
  Shield,
  TrendingUp,
  Target,
  Award,
  Medal,
  Crown,
  Sparkles,
};

// `Dragon` → Flame (dragons breathe fire); `Ogre` → Bug (chunky creature).
// lucide-react has no Dragon/Ogre exports; substitutes keep the boss UI distinct.
const BOSS_ICONS: Record<string, LucideIcon> = {
  Dragon: Flame,
  Mountain,
  Ghost,
  Skull,
  Ogre: Bug,
};

export function gameAchievementIcon(name: string): LucideIcon {
  return ACHIEVEMENT_ICONS[name] ?? Award;
}

export function bossIcon(name: string): LucideIcon {
  return BOSS_ICONS[name] ?? Skull;
}
