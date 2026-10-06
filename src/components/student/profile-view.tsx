"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession, signOut } from "next-auth/react";
import { User, Save, Loader2, GraduationCap, Target, Phone, ImageOff, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { useNav } from "@/lib/store";
import {
  PageHeader,
  LoadingGrid,
  ErrorState,
} from "@/components/shared/ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { ProfileDTO } from "@/lib/types";

const EDUCATION_LEVELS = ["SD", "SMP", "SMA", "Kuliah"];

export function ProfileView() {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "Siswa";
  const reset = useNav((s) => s.reset);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.getProfile(),
  });

  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<ProfileDTO>) => api.updateProfile(payload),
    onSuccess: () => {
      toast.success("Profil berhasil disimpan");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message || "Gagal menyimpan profil"),
  });

  if (isLoading) return <LoadingGrid count={3} />;
  if (isError) return <ErrorState message={error?.message ?? "Gagal memuat profil"} />;
  if (!data) return null;

  async function handleLogout() {
    reset();
    await signOut({ callbackUrl: "/" });
  }

  return (
    <ProfileForm
      initial={data}
      userName={userName}
      saving={updateMutation.isPending}
      onSave={(payload) => updateMutation.mutate(payload)}
      onLogout={handleLogout}
    />
  );
}

function ProfileForm({
  initial,
  userName,
  saving,
  onSave,
  onLogout,
}: {
  initial: ProfileDTO;
  userName: string;
  saving: boolean;
  onSave: (payload: Partial<ProfileDTO>) => void;
  onLogout: () => void;
}) {
  // Lazy initializer — runs once when the component mounts.
  // When parent refetches profile data, this component stays mounted at the
  // same position so state is preserved (user's edits aren't wiped).
  const [form, setForm] = useState<ProfileDTO>(() => ({
    bio: initial.bio ?? null,
    avatarUrl: initial.avatarUrl ?? null,
    educationLevel: initial.educationLevel ?? null,
    targetExam: initial.targetExam ?? null,
    studyGoals: initial.studyGoals ?? null,
    phone: initial.phone ?? null,
  }));
  const [dirty, setDirty] = useState(false);

  const set = <K extends keyof ProfileDTO>(key: K, value: ProfileDTO[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    onSave({
      bio: form.bio || null,
      avatarUrl: form.avatarUrl || null,
      educationLevel: form.educationLevel || null,
      targetExam: form.targetExam || null,
      studyGoals: form.studyGoals || null,
      phone: form.phone || null,
    });
    setDirty(false);
  };

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil Saya"
        description="Kelola informasi profil dan target belajar."
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Informasi Profil</CardTitle>
            <CardDescription>
              Perbarui detail diri dan target belajar kamu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Ceritakan sedikit tentang dirimu…"
                value={form.bio ?? ""}
                onChange={(e) => set("bio", e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="educationLevel">Jenjang Pendidikan</Label>
                <Select
                  value={form.educationLevel ?? ""}
                  onValueChange={(v) => set("educationLevel", v)}
                >
                  <SelectTrigger id="educationLevel" className="w-full">
                    <SelectValue placeholder="Pilih jenjang" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>
                        {lvl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetExam">Target Ujian</Label>
                <Input
                  id="targetExam"
                  placeholder="contoh: UTBK 2025"
                  value={form.targetExam ?? ""}
                  onChange={(e) => set("targetExam", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="studyGoals">Tujuan Belajar</Label>
              <Textarea
                id="studyGoals"
                placeholder="Apa tujuan belajar kamu?"
                value={form.studyGoals ?? ""}
                onChange={(e) => set("studyGoals", e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Nomor Telepon</Label>
                <Input
                  id="phone"
                  placeholder="08xx-xxxx-xxxx"
                  value={form.phone ?? ""}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatarUrl">URL Avatar</Label>
                <Input
                  id="avatarUrl"
                  placeholder="https://…"
                  value={form.avatarUrl ?? ""}
                  onChange={(e) => set("avatarUrl", e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSave}
                disabled={saving || !dirty}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Simpan Perubahan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview card */}
        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle className="text-base">Preview Profil</CardTitle>
            <CardDescription>Bagaimana profil kamu terlihat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center text-center py-2">
              <Avatar className="w-20 h-20 border-2 border-primary/20">
                {form.avatarUrl ? <AvatarImage src={form.avatarUrl} alt={userName} /> : null}
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {initials || <User className="w-6 h-6" />}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-lg mt-3">{userName}</h3>
              {form.educationLevel && (
                <Badge variant="secondary" className="mt-1 gap-1">
                  <GraduationCap className="w-3 h-3" />
                  {form.educationLevel}
                </Badge>
              )}
            </div>

            {form.bio && (
              <p className="text-sm text-muted-foreground text-center italic">
                &ldquo;{form.bio}&rdquo;
              </p>
            )}

            <div className="space-y-2 pt-2 border-t">
              {form.targetExam && (
                <div className="flex items-start gap-2 text-sm">
                  <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Target Ujian</p>
                    <p className="font-medium">{form.targetExam}</p>
                  </div>
                </div>
              )}
              {form.studyGoals && (
                <div className="flex items-start gap-2 text-sm">
                  <GraduationCap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Tujuan Belajar</p>
                    <p className="font-medium">{form.studyGoals}</p>
                  </div>
                </div>
              )}
              {form.phone && (
                <div className="flex items-start gap-2 text-sm">
                  <Phone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Telepon</p>
                    <p className="font-medium">{form.phone}</p>
                  </div>
                </div>
              )}
              {!form.bio &&
                !form.targetExam &&
                !form.studyGoals &&
                !form.phone && (
                  <div className="flex flex-col items-center text-center py-4 text-sm text-muted-foreground">
                    <ImageOff className="w-5 h-5 mb-1.5" />
                    Lengkapi profil untuk melihat preview di sini
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logout section */}
      <Card className="border-destructive/20">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Keluar dari Akun</p>
              <p className="text-sm text-muted-foreground">
                Keluar dari perangkat ini. Kamu perlu masuk lagi untuk
 mengakses materi dan progress.
              </p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/5">
                <LogOut className="w-4 h-4 mr-2" />
                Keluar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Keluar dari akun?</AlertDialogTitle>
                <AlertDialogDescription>
                  Kamu akan keluar dari akun {userName}. Progress belajar kamu
                  tetap tersimpan dan bisa diakses setelah masuk kembali.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onLogout}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Ya, Keluar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProfileView;
