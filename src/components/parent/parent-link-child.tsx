"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  Mail,
  Users,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useNav } from "@/lib/store";
import {
  PageHeader,
  LoadingGrid,
  ErrorState,
} from "@/components/shared/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { BackButton } from "@/components/analytics/_shared";

const RELATIONS = ["Orang Tua", "Wali", "Kakak", "Adik", "Kakek", "Nenek"];

export function ParentLinkChild() {
  const setView = useNav((s) => s.setView);
  const openParentChildDetail = useNav((s) => s.openParentChildDetail);
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [relation, setRelation] = useState("Orang Tua");

  const { data: children, isLoading, isError, error } = useQuery({
    queryKey: ["parent-children"],
    queryFn: () => api.getParentChildren(),
  });

  const linkMutation = useMutation({
    mutationFn: () => api.linkChild(email.trim(), relation),
    onSuccess: () => {
      toast.success("Berhasil menautkan akun anak!");
      queryClient.invalidateQueries({ queryKey: ["parent-children"] });
      queryClient.invalidateQueries({ queryKey: ["parent-dashboard"] });
      setView("dashboard");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal menautkan akun");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Masukkan email akun siswa");
      return;
    }
    linkMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <BackButton onClick={() => setView("dashboard")} label="Kembali" />

      <PageHeader
        title="Tautkan Akun Anak"
        description="Masukkan email akun siswa anak Anda untuk memantau progressnya."
      />

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            Tautkan Akun Baru
          </CardTitle>
          <CardDescription>
            Pastikan anak Anda sudah mendaftar sebagai siswa di EduTrack.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="student-email">Email Akun Siswa</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="student-email"
                  type="email"
                  placeholder="nama.anak@email.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={linkMutation.isPending}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="relation">Hubungan</Label>
              <Select value={relation} onValueChange={setRelation} disabled={linkMutation.isPending}>
                <SelectTrigger id="relation">
                  <SelectValue placeholder="Pilih hubungan" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={linkMutation.isPending || !email.trim()}
              className="w-full sm:w-auto"
            >
              {linkMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menautkan...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Tautkan
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Already linked children */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Anak yang Sudah Ditautkan
        </h2>

        {isLoading ? (
          <LoadingGrid count={2} />
        ) : isError ? (
          <ErrorState message={error?.message ?? "Gagal memuat daftar anak"} />
        ) : !children || children.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Belum ada akun anak yang ditautkan.
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {children.map((link) => {
              const initials = link.student.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              return (
                <Card key={link.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="w-11 h-11 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{link.student.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {link.student.email}
                      </p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {link.relation}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openParentChildDetail(link.student.id)}
                      className="shrink-0"
                    >
                      Lihat Detail
                      <ArrowUpRight className="w-3 h-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default ParentLinkChild;
