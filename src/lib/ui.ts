import {
  Calculator,
  Atom,
  Languages,
  BookOpen,
  FlaskConical,
  Brain,
  Music,
  Palette,
  Code,
  Globe,
  History,
  Map,
  type LucideIcon,
} from "lucide-react";

export const SUBJECT_COLORS: Record<
  string,
  { bg: string; text: string; border: string; ring: string; dot: string }
> = {
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    ring: "ring-emerald-500/20",
    dot: "bg-emerald-500",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
    ring: "ring-orange-500/20",
    dot: "bg-orange-500",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
    ring: "ring-rose-500/20",
    dot: "bg-rose-500",
  },
  violet: {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-800",
    ring: "ring-violet-500/20",
    dot: "bg-violet-500",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    ring: "ring-amber-500/20",
    dot: "bg-amber-500",
  },
  teal: {
    bg: "bg-teal-50 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800",
    ring: "ring-teal-500/20",
    dot: "bg-teal-500",
  },
  cyan: {
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200 dark:border-cyan-800",
    ring: "ring-cyan-500/20",
    dot: "bg-cyan-500",
  },
  fuchsia: {
    bg: "bg-fuchsia-50 dark:bg-fuchsia-950/40",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    border: "border-fuchsia-200 dark:border-fuchsia-800",
    ring: "ring-fuchsia-500/20",
    dot: "bg-fuchsia-500",
  },
};

export function colorClasses(color: string) {
  return SUBJECT_COLORS[color] ?? SUBJECT_COLORS.emerald;
}

const ICONS: Record<string, LucideIcon> = {
  Calculator,
  Atom,
  Languages,
  BookOpen,
  FlaskConical,
  Brain,
  Music,
  Palette,
  Code,
  Globe,
  History,
  Map,
};

export function subjectIcon(name: string): LucideIcon {
  return ICONS[name] ?? BookOpen;
}

export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}d`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}j ${rem}m` : `${h}j`;
}

export function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} hari lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function statusLabel(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "Selesai";
    case "IN_PROGRESS":
      return "Sedang Berjalan";
    case "ABANDONED":
      return "Ditinggalkan";
    case "NOT_STARTED":
      return "Belum Dimulai";
    default:
      return status;
  }
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    case "ABANDONED":
      return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    case "NOT_STARTED":
    default:
      return "bg-muted text-muted-foreground";
  }
}
