"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays, MapPin, Camera, CheckCircle2,
  XCircle, Clock, Plus, Trash2, Users, Loader2,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";

/* ─── types ─── */
interface Student { id: string; name: string; email: string; grade?: string | null }
interface AttendanceRecord {
  id: string; studentId: string; date: string; status: string;
  location: string | null; latitude: number | null; longitude: number | null;
  photoUrl: string | null; notes: string | null;
  student: Student;
  feedback: { mood: string; rating: number; notes: string | null } | null;
}

const STATUS_CONFIG = {
  PRESENT: { label: "Hadir",     icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  ABSENT:  { label: "Tidak Hadir", icon: XCircle,    color: "text-red-600 bg-red-50 border-red-200" },
  LATE:    { label: "Terlambat", icon: Clock,        color: "text-amber-600 bg-amber-50 border-amber-200" },
} as const;

const MOOD_EMOJI: Record<string, string> = {
  GREAT: "😄", GOOD: "🙂", OKAY: "😐", BAD: "😔",
};

/* ─── fetch helpers ─── */
async function fetchStudents(): Promise<Student[]> {
  const res = await fetch("/api/students/list");
  if (!res.ok) return [];
  return res.json();
}

async function fetchAttendance(): Promise<AttendanceRecord[]> {
  const res = await fetch("/api/attendance");
  if (!res.ok) return [];
  return res.json();
}

/* ─── main component ─── */
export function AttendanceManager() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["attendance"],
    queryFn: fetchAttendance,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-list"],
    queryFn: fetchStudents,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/attendance/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Absensi dihapus");
    },
  });

  // Group by date
  const byDate = records.reduce<Record<string, AttendanceRecord[]>>((acc, r) => {
    (acc[r.date] ??= []).push(r);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Absensi</h2>
          <p className="text-muted-foreground text-sm">Catat kehadiran siswa setiap sesi</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Catat Absensi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Catat Absensi</DialogTitle>
            </DialogHeader>
            <AttendanceForm
              students={students}
              onSuccess={() => {
                setOpen(false);
                qc.invalidateQueries({ queryKey: ["attendance"] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
            <Users className="w-10 h-10 opacity-30" />
            <p className="font-medium">Belum ada catatan absensi</p>
            <p className="text-sm">Mulai catat kehadiran siswa kamu</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {dates.map((date) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground">
                  {new Date(date + "T00:00:00").toLocaleDateString("id-ID", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  })}
                </span>
              </div>
              <div className="space-y-3">
                {byDate[date].map((r) => (
                  <AttendanceCard
                    key={r.id}
                    record={r}
                    onDelete={() => deleteMut.mutate(r.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── attendance card ─── */
function AttendanceCard({
  record,
  onDelete,
}: {
  record: AttendanceRecord;
  onDelete: () => void;
}) {
  const cfg = STATUS_CONFIG[record.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PRESENT;
  const Icon = cfg.icon;

  return (
    <Card>
      <CardContent className="p-4 flex gap-4">
        {/* Photo */}
        {record.photoUrl ? (
          <img
            src={record.photoUrl}
            alt="Foto absensi"
            className="w-16 h-16 rounded-lg object-cover shrink-0 border"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-muted border flex items-center justify-center shrink-0">
            <Camera className="w-6 h-6 text-muted-foreground/40" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold truncate">{record.student.name}</p>
              {record.student.grade && (
                <p className="text-xs text-muted-foreground">Kelas {record.student.grade}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={`text-xs gap-1 ${cfg.color}`}>
                <Icon className="w-3 h-3" />
                {cfg.label}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {record.location && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{record.location}</span>
            </div>
          )}

          {record.notes && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{record.notes}</p>
          )}

          {record.feedback && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span>{MOOD_EMOJI[record.feedback.mood] ?? "🙂"}</span>
              <span className="text-muted-foreground">
                Feedback siswa · ⭐ {record.feedback.rating}/5
              </span>
              {record.feedback.notes && (
                <span className="text-muted-foreground italic truncate">"{record.feedback.notes}"</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── attendance form ─── */
function AttendanceForm({
  students,
  onSuccess,
}: {
  students: Student[];
  onSuccess: () => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("PRESENT");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  }

  function getGPS() {
    if (!navigator.geolocation) {
      toast.error("GPS tidak tersedia di perangkat ini");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGpsLoading(false);
        toast.success("Koordinat GPS berhasil diambil");
      },
      () => {
        setGpsLoading(false);
        toast.error("Gagal mendapatkan lokasi GPS");
      },
      { timeout: 10000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) { toast.error("Pilih siswa terlebih dahulu"); return; }

    setLoading(true);
    const fd = new FormData();
    fd.append("studentId", studentId);
    fd.append("date", date);
    fd.append("status", status);
    if (location) fd.append("location", location);
    if (lat !== null) fd.append("latitude", String(lat));
    if (lng !== null) fd.append("longitude", String(lng));
    if (notes) fd.append("notes", notes);
    if (photo) fd.append("photo", photo);

    try {
      const res = await fetch("/api/attendance", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Gagal menyimpan");
      }
      toast.success("Absensi berhasil dicatat");
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Siswa */}
      <div className="space-y-1.5">
        <Label>Siswa</Label>
        <Select value={studentId} onValueChange={setStudentId}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih siswa..." />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}{s.grade ? ` · Kelas ${s.grade}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Tanggal */}
        <div className="space-y-1.5">
          <Label>Tanggal</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRESENT">✅ Hadir</SelectItem>
              <SelectItem value="LATE">⏰ Terlambat</SelectItem>
              <SelectItem value="ABSENT">❌ Tidak Hadir</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lokasi + GPS */}
      <div className="space-y-1.5">
        <Label>Lokasi</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Nama lokasi / alamat..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="flex-1"
          />
          <Button type="button" variant="outline" size="icon" onClick={getGPS} disabled={gpsLoading}>
            {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          </Button>
        </div>
        {lat !== null && (
          <p className="text-xs text-muted-foreground">
            📍 {lat.toFixed(5)}, {lng?.toFixed(5)}
          </p>
        )}
      </div>

      {/* Foto */}
      <div className="space-y-1.5">
        <Label>Foto (opsional)</Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhoto}
        />
        {preview ? (
          <div className="relative w-full h-36 rounded-lg overflow-hidden border">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute bottom-2 right-2"
              onClick={() => fileRef.current?.click()}
            >
              Ganti
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <Camera className="w-6 h-6" />
            <span className="text-sm">Ambil foto / upload gambar</span>
          </button>
        )}
      </div>

      {/* Catatan */}
      <div className="space-y-1.5">
        <Label>Catatan (opsional)</Label>
        <Textarea
          placeholder="Catatan sesi hari ini..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Simpan Absensi
      </Button>
    </form>
  );
}
