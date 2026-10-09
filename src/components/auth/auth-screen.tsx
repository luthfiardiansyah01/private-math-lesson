"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GraduationCap, Loader2, BookOpen, Users, BarChart3, Heart, Baby, Sparkles, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Role, AppVersion, Grade } from "@/lib/types";

export function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<Role>("STUDENT");
  const [appVersion, setAppVersion] = useState<AppVersion>("TEENS");
  const [grade, setGrade] = useState<Grade>("IX");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [name, setName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        toast.error("Email atau password salah");
      } else {
        toast.success("Berhasil masuk!");
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !regEmail || !regPassword) return;
    if (regPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setLoading(true);
    try {
      const res = await api.register({
        name,
        email: regEmail,
        password: regPassword,
        role,
        appVersion,
        grade: role === "STUDENT" ? grade : undefined,
      });
      if (res.ok) {
        toast.success("Akun berhasil dibuat! Silakan masuk.");
        setMode("login");
        setEmail(regEmail);
        setPassword("");
      } else {
        toast.error(res.error || "Gagal mendaftar");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mendaftar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="lg:w-1/2 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-violet-300 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-400 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-widest">HIKABRIDGE</span>
              <p className="text-[10px] text-violet-200 tracking-widest leading-none mt-0.5">BRIDGING · EDUCATION · PROGRESS</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold mb-4">
            <Sparkles className="w-3 h-3" /> Teens Edition v2.0
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-4">
            Belajar jadi seru,
            <br /> progress nyata.
          </h1>
          <p className="text-violet-100 text-lg max-w-md">
            Platform les matematika privat untuk SMP & SMA. Materi terstruktur,
            quiz adaptif, dan tracking progress real-time.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-4 mt-8 max-w-md">
          <Feature icon={BookOpen} label="Materi Terstruktur" />
          <Feature icon={BarChart3} label="Progress Tracking" />
          <Feature icon={Sparkles} label="Quiz Adaptif" />
        </div>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-widest">HIKABRIDGE</span>
              <p className="text-[10px] text-muted-foreground tracking-widest leading-none mt-0.5">BRIDGING · EDUCATION · PROGRESS</p>
            </div>
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Masuk</TabsTrigger>
              <TabsTrigger value="register">Daftar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Selamat datang kembali</CardTitle>
                  <CardDescription>
                    Masuk untuk melanjutkan pembelajaran
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="nama@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Masuk
                    </Button>
                  </form>
                  <div className="mt-4 p-3 rounded-lg bg-muted/60 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Akun Demo:</p>
                    <p>
                      Tutor:{" "}
                      <code className="font-mono">tutor@hikari.id</code> /{" "}
                      <code className="font-mono">tutor123</code>
                    </p>
                    <p>
                      Student:{" "}
                      <code className="font-mono">student@hikari.id</code> /{" "}
                      <code className="font-mono">student123</code>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Buat akun baru</CardTitle>
                  <CardDescription>
                    Pilih peran Anda untuk mulai belajar atau mengajar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Pilih Peran</Label>
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <RoleButton
                          active={role === "STUDENT"}
                          onClick={() => setRole("STUDENT")}
                          icon={GraduationCap}
                          title="Student"
                          desc="Belajar & bermain"
                        />
                        <RoleButton
                          active={role === "TUTOR"}
                          onClick={() => setRole("TUTOR")}
                          icon={Users}
                          title="Tutor"
                          desc="Kelola materi"
                        />
                        <RoleButton
                          active={role === "PARENT"}
                          onClick={() => setRole("PARENT")}
                          icon={Heart}
                          title="Orang Tua"
                          desc="Pantau anak"
                        />
                      </div>
                    </div>

                    {role === "STUDENT" && (
                      <>
                        <div className="space-y-2">
                          <Label>Versi Aplikasi</Label>
                          <div className="grid grid-cols-3 gap-2">
                            <VersionButton
                              active={appVersion === "KIDS"}
                              onClick={() => setAppVersion("KIDS")}
                              icon={Baby}
                              title="Kids"
                              desc="SD"
                            />
                            <VersionButton
                              active={appVersion === "TEENS"}
                              onClick={() => setAppVersion("TEENS")}
                              icon={Sparkles}
                              title="Teens"
                              desc="SMP/SMA"
                            />
                            <VersionButton
                              active={appVersion === "ADULTS"}
                              onClick={() => setAppVersion("ADULTS")}
                              icon={Briefcase}
                              title="Adults"
                              desc="Umum"
                            />
                          </div>
                        </div>

                        {(appVersion === "TEENS") && (
                          <div className="space-y-2">
                            <Label>Kelas</Label>
                            <Select value={grade} onValueChange={(v) => setGrade(v as Grade)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih kelas" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="VII">Kelas VII (SMP 1)</SelectItem>
                                <SelectItem value="VIII">Kelas VIII (SMP 2)</SelectItem>
                                <SelectItem value="IX">Kelas IX (SMP 3)</SelectItem>
                                <SelectItem value="X">Kelas X (SMA 1)</SelectItem>
                                <SelectItem value="XI">Kelas XI (SMA 2)</SelectItem>
                                <SelectItem value="XII">Kelas XII (SMA 3)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="name">Nama Lengkap</Label>
                      <Input
                        id="name"
                        placeholder="Nama Anda"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">Email</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="nama@email.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="Minimal 6 karakter"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Daftar sebagai{" "}
                      {role === "STUDENT"
                        ? "Student"
                        : role === "TUTOR"
                        ? "Tutor"
                        : "Orang Tua"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="w-10 h-10 bg-white/15 backdrop-blur rounded-lg flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs text-emerald-50 leading-tight">{label}</span>
    </div>
  );
}

function VersionButton({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1 p-3 rounded-lg border-2 text-left transition-colors ${
        active
          ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
          : "border-border hover:border-violet-300"
      }`}
    >
      <Icon
        className={`w-5 h-5 ${active ? "text-violet-600" : "text-muted-foreground"}`}
      />
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-[11px] text-muted-foreground leading-tight">{desc}</span>
    </button>
  );
}

function RoleButton({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1 p-3 rounded-lg border-2 text-left transition-colors ${
        active
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40"
      }`}
    >
      <Icon
        className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`}
      />
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-[11px] text-muted-foreground leading-tight">{desc}</span>
    </button>
  );
}
