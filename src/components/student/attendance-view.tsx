"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays, CheckCircle2, XCircle, Clock,
  Camera, MapPin, Loader2, MessageSquare, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface AttendanceRecord {
  id: string; date: string; status: string;
  location: string | null; photoUrl: string | null; notes: string | null;
  tutor: { name: string };
  feedback: { mood: string; rating: number; notes: string | null } | null;
}

const STATUS_CONFIG = {
  PRESENT: { label: "Hadir",       icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  ABSENT:  { label: "Tidak Hadir", icon: XCircle,      color: "text-red-600 bg-red-50 border-red-200" },
  LATE:    { label: "Terlambat",   icon: Clock,        color: "text-amber-600 bg-amber-50 border-amber-200" },
} as const;

const MOODS = [
  { value: "GREAT", emoji: "😄", label: "Seru banget!" },
  { value: "GOOD",  emoji: "🙂", label: "Oke" },
  { value: "OKAY",  emoji: "😐", label: "Biasa aja" },
  { value: "BAD",   emoji: "😔", label: "Berat" },
];

async function fetchAttendance(): Promise<AttendanceRecord[]> {
  const res = await fetch("/api/attendance");
  if (!res.ok) return [];
  return res.json();
}

export function AttendanceView() {
  const qc = useQueryClient();
  const [feedbackTarget, setFeedbackTarget] = useState<AttendanceRecord | null>(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["attendance"],
    queryFn: fetchAttendance,
  });

  const feedbackMut = useMutation({
    mutationFn: ({ id, mood, rating, notes }: { id: string; mood: string; rating: number; notes: string }) =>
      fetch(`/api/attendance/${id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, rating, notes }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      setFeedbackTarget(null);
      toast.success("Feedback terkirim! Terima kasih 🎉");
    },
    onError: () => toast.error("Gagal mengirim feedback"),
  });

  // Stats
  const total   = records.length;
  const present = records.filter((r) => r.status === "PRESENT").length;
  const late    = records.filter((r) => r.status === "LATE").length;
  const absent  = records.filter((r) => r.status === "ABSENT").length;
  const pct     = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  // Group by month
  const byMonth = records.reduce<Record<string, AttendanceRecord[]>>((acc, r) => {
    const month = r.date.slice(0, 7);
    (acc[month] ??= []).push(r);
    return acc;
  }, {});
  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Absensi Saya</h2>
        <p className="text-muted-foreground text-sm">Riwayat kehadiran sesi belajarmu</p>
      </div>

      {/* Stats */}
      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Sesi", value: total, color: "text-foreground" },
            { label: "Hadir",      value: present, color: "text-emerald-600" },
            { label: "Terlambat",  value: late,    color: "text-amber-600" },
            { label: "Absen",      value: absent,  color: "text-red-600" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Kehadiran bar */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tingkat kehadiran</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
            <CalendarDays className="w-10 h-10 opacity-30" />
            <p className="font-medium">Belum ada catatan absensi</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {months.map((month) => (
            <div key={month}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {new Date(month + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
              </p>
              <div className="space-y-3">
                {byMonth[month].map((r) => {
                  const cfg = STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PRESENT;
                  const Icon = cfg.icon;
                  return (
                    <Card key={r.id}>
                      <CardContent className="p-4 flex gap-4">
                        {r.photoUrl ? (
                          <img src={r.photoUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 border" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-muted border flex items-center justify-center shrink-0">
                            <Camera className="w-5 h-5 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">
                                {new Date(r.date + "T00:00:00").toLocaleDateString("id-ID", {
                                  weekday: "long", day: "numeric", month: "short",
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">{r.tutor.name}</p>
                            </div>
                            <Badge variant="outline" className={`text-xs gap-1 shrink-0 ${cfg.color}`}>
                              <Icon className="w-3 h-3" />
                              {cfg.label}
                            </Badge>
                          </div>
                          {r.location && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{r.location}</span>
                            </div>
                          )}
                          {r.feedback ? (
                            <p className="text-xs text-muted-foreground mt-2">
                              Feedback: {MOODS.find((m) => m.value === r.feedback!.mood)?.emoji} ⭐ {r.feedback.rating}/5
                            </p>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 h-7 text-xs gap-1"
                              onClick={() => setFeedbackTarget(r)}
                            >
                              <MessageSquare className="w-3 h-3" />
                              Beri Feedback
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feedback Dialog */}
      <Dialog open={!!feedbackTarget} onOpenChange={(o) => !o && setFeedbackTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Feedback Sesi</DialogTitle>
          </DialogHeader>
          {feedbackTarget && (
            <FeedbackForm
              record={feedbackTarget}
              onSubmit={(mood, rating, notes) =>
                feedbackMut.mutate({ id: feedbackTarget.id, mood, rating, notes })
              }
              loading={feedbackMut.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── feedback form ─── */
function FeedbackForm({
  record,
  onSubmit,
  loading,
}: {
  record: AttendanceRecord;
  onSubmit: (mood: string, rating: number, notes: string) => void;
  loading: boolean;
}) {
  const [mood, setMood] = useState("GOOD");
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Sesi{" "}
        {new Date(record.date + "T00:00:00").toLocaleDateString("id-ID", {
          weekday: "long", day: "numeric", month: "long",
        })}
      </p>

      {/* Mood */}
      <div className="space-y-2">
        <Label>Gimana sesi tadi?</Label>
        <div className="grid grid-cols-4 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(m.value)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors text-xs ${
                mood === m.value
                  ? "border-primary bg-primary/5"
                  : "border-transparent bg-muted hover:bg-muted/80"
              }`}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div className="space-y-2">
        <Label>Rating ({rating}/5)</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((v) => (
            <button key={v} type="button" onClick={() => setRating(v)} className="text-2xl">
              <Star
                className={`w-7 h-7 transition-colors ${
                  v <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>Catatan (opsional)</Label>
        <Textarea
          placeholder="Ada yang ingin kamu sampaikan ke tutor?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <Button
        className="w-full"
        onClick={() => onSubmit(mood, rating, notes)}
        disabled={loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Kirim Feedback
      </Button>
    </div>
  );
}
