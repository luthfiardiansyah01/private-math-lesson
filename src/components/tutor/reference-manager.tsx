"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Upload,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Chapter {
  id: string;
  title: string;
  order: number;
}

interface SubjectReference {
  id: string;
  title: string;
  filename: string;
  sizeBytes: number;
  status: "PROCESSING" | "READY" | "ERROR";
  errorMsg?: string | null;
  chapters: Chapter[];
  createdAt: string;
}

// ─── Utils ───────────────────────────────────────────────────────────────────

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

// ─── ReferenceManager ────────────────────────────────────────────────────────

export function ReferenceManager({ subjectId }: { subjectId: string }) {
  const qc = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: refs = [], isLoading } = useQuery<SubjectReference[]>({
    queryKey: ["references", subjectId],
    queryFn: () =>
      fetch(`/api/subjects/${subjectId}/references`).then((r) => r.json()),
    refetchInterval: (q) => {
      const data = q.state.data as SubjectReference[] | undefined;
      return data?.some((r) => r.status === "PROCESSING") ? 4000 : false;
    },
  });

  const deleteMut = useMutation({
    mutationFn: (refId: string) =>
      fetch(`/api/subjects/${subjectId}/references/${refId}`, {
        method: "DELETE",
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["references", subjectId] });
      toast.success("Referensi dihapus");
    },
  });

  const retryMut = useMutation({
    mutationFn: (refId: string) =>
      fetch(`/api/subjects/${subjectId}/references/${refId}`, {
        method: "PATCH",
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["references", subjectId] });
      toast.success("Memproses ulang referensi...");
    },
    onError: () => toast.error("Gagal retry"),
  });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Referensi Buku</h3>
          {refs.length > 0 && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
              {refs.length} buku
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          Upload Buku
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Memuat referensi...
        </div>
      ) : refs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Belum ada referensi buku
          </p>
          <p className="text-xs text-muted-foreground">
            Upload PDF buku/modul — bab akan diekstrak otomatis oleh AI
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {refs.map((ref) => (
            <ReferenceCard
              key={ref.id}
              ref_={ref}
              onDelete={() => deleteMut.mutate(ref.id)}
              onRetry={() => retryMut.mutate(ref.id)}
              deleting={deleteMut.isPending}
              retrying={retryMut.isPending}
            />
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadOpen}
        subjectId={subjectId}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["references", subjectId] });
          setUploadOpen(false);
        }}
      />
    </div>
  );
}

// ─── ReferenceCard ────────────────────────────────────────────────────────────

function ReferenceCard({
  ref_,
  onDelete,
  onRetry,
  deleting,
  retrying,
}: {
  ref_: SubjectReference;
  onDelete: () => void;
  onRetry: () => void;
  deleting: boolean;
  retrying: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon =
    ref_.status === "READY" ? (
      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
    ) : ref_.status === "ERROR" ? (
      <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
    ) : (
      <Loader2 className="w-4 h-4 animate-spin text-amber-500 shrink-0" />
    );

  const statusText =
    ref_.status === "READY"
      ? `${ref_.chapters.length} bab`
      : ref_.status === "ERROR"
      ? "Gagal diproses"
      : "Sedang diproses...";

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <FileText className="w-8 h-8 text-red-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{ref_.title}</p>
          <p className="text-xs text-muted-foreground">
            {fmtBytes(ref_.sizeBytes)} · {ref_.filename}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {statusIcon}
          <span
            className={`text-xs ${
              ref_.status === "READY"
                ? "text-emerald-600"
                : ref_.status === "ERROR"
                ? "text-destructive"
                : "text-amber-600"
            }`}
          >
            {statusText}
          </span>
        </div>
        {ref_.status === "READY" && ref_.chapters.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-1 hover:bg-muted rounded"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="w-7 h-7 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          disabled={deleting}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {ref_.status === "ERROR" && (
        <div className="px-3 pb-3 space-y-2">
          {ref_.errorMsg && (
            <p className="text-xs text-destructive bg-destructive/5 rounded p-2">
              {ref_.errorMsg}
            </p>
          )}
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2 text-xs"
            onClick={onRetry}
            disabled={retrying}
          >
            {retrying ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Coba Proses Ulang
          </Button>
        </div>
      )}

      {ref_.status === "PROCESSING" && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded p-2">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            AI sedang mengekstrak daftar bab dari PDF... Ini mungkin memerlukan
            1–3 menit.
          </div>
        </div>
      )}

      {expanded && ref_.chapters.length > 0 && (
        <div className="border-t px-3 pb-3 pt-2 space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Daftar Bab
          </p>
          {ref_.chapters.map((ch) => (
            <div
              key={ch.id}
              className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-muted/50"
            >
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                {ch.order}
              </span>
              <span>{ch.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── UploadDialog ─────────────────────────────────────────────────────────────

function UploadDialog({
  open,
  subjectId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  subjectId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    setFile(null);
    setTitle("");
    onClose();
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title || file.name.replace(/\.pdf$/i, ""));
      const res = await fetch(`/api/subjects/${subjectId}/references`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal upload");
      toast.success(
        "Buku berhasil diupload! AI sedang mengekstrak daftar bab..."
      );
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal upload");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Buku Referensi</DialogTitle>
          <DialogDescription>
            Upload PDF buku atau modul. AI akan otomatis mendeteksi dan
            mengekstrak daftar bab.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pilih file */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !title) setTitle(f.name.replace(/\.pdf$/i, ""));
              }}
            />
            {file ? (
              <div className="space-y-1">
                <FileText className="w-8 h-8 text-red-400 mx-auto" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtBytes(file.size)}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Klik untuk pilih file PDF
                </p>
                <p className="text-xs text-muted-foreground">Maks. 50 MB</p>
              </div>
            )}
          </div>

          {/* Judul buku */}
          <div className="space-y-1.5">
            <Label>Judul Buku / Referensi</Label>
            <Input
              placeholder="Contoh: Matematika SMP Kelas IX - Kemendikbud"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleUpload}
              disabled={!file || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengupload...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload & Proses
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
