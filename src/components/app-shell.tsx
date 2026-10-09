"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  User,
  Users,
  UserPlus,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Gamepad2,
  Trophy,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { useNav } from "@/lib/store";
import type { SessionUser } from "@/lib/auth";
import Image from "next/image";

interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const view = useNav((s) => s.view);
  const setView = useNav((s) => s.setView);
  const reset = useNav((s) => s.reset);

  const isStudent = user.role === "STUDENT";
  const isParent = user.role === "PARENT";

  // Scroll to top whenever the view changes.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  const navItems = isStudent
    ? [
        {
          key: "dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          short: "Beranda",
        },
        {
          key: "subjects",
          label: "Materi",
          icon: BookOpen,
          short: "Materi",
        },
        {
          key: "gameHub",
          label: "Game",
          icon: Gamepad2,
          short: "Game",
        },
        {
          key: "progress",
          label: "Progress Saya",
          icon: BarChart3,
          short: "Progress",
        },
        {
          key: "profile",
          label: "Profil",
          icon: User,
          short: "Profil",
        },
      ]
    : isParent
    ? [
        {
          key: "dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          short: "Beranda",
        },
        {
          key: "parentLinkChild",
          label: "Tautkan Anak",
          icon: UserPlus,
          short: "Taut",
        },
      ]
    : [
        {
          key: "dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          short: "Beranda",
        },
        {
          key: "manage",
          label: "Kelola Materi",
          icon: BookOpen,
          short: "Kelola",
        },
        {
          key: "tutorAnalytics",
          label: "Analitik",
          icon: BarChart3,
          short: "Analitik",
        },
        {
          key: "students",
          label: "Siswa Saya",
          icon: Users,
          short: "Siswa",
        },
      ];

  // Secondary nav items shown in the sidebar
  // for quick access.
  const secondaryNavItems = isStudent
    ? [
        {
          key: "achievements",
          label: "Achievement",
          icon: Trophy,
          short: "Lencana",
        },
        {
          key: "gameHistory",
          label: "Riwayat Game",
          icon: History,
          short: "Riwayat",
        },
      ]
    : [];

  function handleNav(key: string) {
    setView(key);
    setMobileOpen(false);
  }

  async function handleLogout() {
    reset();
    setMobileOpen(false);
    await signOut({ callbackUrl: "/" });
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const versionLabel =
    user.appVersion === "KIDS"
      ? "Kids"
      : user.appVersion === "ADULTS"
      ? "Adults"
      : "Teens";

  const gradeLabel = user.grade ? ` · Kelas ${user.grade}` : "";

  const roleLabel = isStudent
    ? `Student ${versionLabel}${gradeLabel}`
    : isParent
    ? "Orang Tua"
    : "Tutor";

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      {/* ========================================
          TOP BAR - MOBILE
          ======================================== */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b bg-background">
        <div className="flex items-center gap-2">
          <Image src="/hikari-bridge-logo-transparent.svg" alt="Logo" width={32} height={32} className="rounded-lg" />
          <span className="font-bold">HIKABRIDGE</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Logout */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Keluar"
                type="button"
                className="text-muted-foreground"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Keluar dari akun?
                </AlertDialogTitle>

                <AlertDialogDescription>
                  Kamu akan keluar dari akun {user.name}. Kamu perlu masuk
                  lagi untuk mengakses materi dan progress.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>
                  Batal
                </AlertDialogCancel>

                <AlertDialogAction
                  onClick={handleLogout}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Ya, Keluar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Avatar */}
          <Avatar className="w-8 h-8 border">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Mobile Menu */}
          <Sheet
            open={mobileOpen}
            onOpenChange={setMobileOpen}
          >
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Toggle menu"
                type="button"
              >
                {mobileOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </SheetTrigger>

            <SheetContent
              side="left"
              className="w-72 p-0"
            >
              <SidebarContent
                navItems={navItems}
                secondaryNavItems={secondaryNavItems}
                view={view}
                onNav={handleNav}
                onLogout={handleLogout}
                userName={user.name}
                userRole={roleLabel}
                initials={initials}
              />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* ========================================
          MAIN LAYOUT
          ======================================== */}
      <div className="flex flex-1">
        {/* ======================================
            SIDEBAR - DESKTOP
            ====================================== */}
        <aside className="hidden lg:block sticky top-0 h-screen w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground">
          <SidebarContent
            navItems={navItems}
            secondaryNavItems={secondaryNavItems}
            view={view}
            onNav={handleNav}
            onLogout={handleLogout}
            userName={user.name}
            userRole={roleLabel}
            initials={initials}
          />
        </aside>

        {/* ======================================
            MAIN CONTENT
            ====================================== */}
        <main className="flex-1 min-w-0 flex flex-col pb-20 lg:pb-0">
          <div className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>

          {/* Footer */}
          <footer className="mt-auto border-t bg-background px-4 lg:px-8 py-4 text-center text-xs text-muted-foreground">
            HIKABRIDGE — Sistem Pembelajaran & Tracking Progress ·
            Core Learning · Gamification · Intelligence
          </footer>
        </main>
      </div>

      {/* ========================================
          BOTTOM NAVIGATION - MOBILE
          ======================================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-background h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = view === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleNav(item.key)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />

              <span className="text-[10px] font-medium leading-none">
                {item.short}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* =====================================================
   SIDEBAR CONTENT
   ===================================================== */

function SidebarContent({
  navItems,
  secondaryNavItems = [],
  view,
  onNav,
  onLogout,
  userName,
  userRole,
  initials,
}: {
  navItems: {
    key: string;
    label: string;
    icon: any;
    short: string;
  }[];

  secondaryNavItems?: {
    key: string;
    label: string;
    icon: any;
    short: string;
  }[];

  view: string;
  onNav: (key: string) => void;
  onLogout: () => void;
  userName: string;
  userRole: string;
  initials: string;
}) {
  return (
    <div className="flex flex-col h-full">

      {/* ==========================================
          DESKTOP BRANDING
          ========================================== */}
      <div className="hidden lg:flex items-center gap-3 px-6 h-20 border-b">
        {/* Logo */}
        <Image src="/hikari-bridge-logo-transparent.svg" alt="Logo" width={32} height={32} className="rounded-lg" />

        {/* Brand + Tagline */}
        <div className="flex flex-col min-w-0 w-full">
          <span className="text-lg font-bold leading-none tracking-[0.22em] whitespace-nowrap">
            HIKABRIDGE
          </span>

          <span className="text-[8px] text-muted-foreground tracking-wider mt-1.5 leading-none whitespace-nowrap">
            BRIDGING • EDUCATION • PROGRESS
          </span>
        </div>

      </div>

      {/* ==========================================
          MOBILE BRANDING
          ========================================== */}
      <div className="lg:hidden flex items-center gap-2 px-6 h-14 border-b">
        <Image src="/hikari-bridge-logo-transparent.svg" alt="Logo" width={32} height={32} className="rounded-lg" />

        <div className="flex flex-col min-w-0 w-full">
          <span className="text-lg font-bold leading-none tracking-[0.28em] whitespace-nowrap">
            HIKABRIDGE
          </span>

          <span className="text-[8px] text-muted-foreground tracking-wider mt-1.5 leading-none whitespace-nowrap">
            BRIDGING • EDUCATION • PROGRESS
          </span>
        </div>

      </div>

      {/* ==========================================
          USER PROFILE
          ========================================== */}
      <div className="p-3 flex items-center gap-3 border-b lg:border-b-0">
        <Avatar className="w-9 h-9 border">
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {userName}
          </p>

          <p className="text-xs text-muted-foreground truncate">
            {userRole}
          </p>
        </div>
      </div>

      {/* ==========================================
          NAVIGATION
          ========================================== */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scroll-area">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = view === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNav(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />

              <span className="flex-1 text-left">
                {item.label}
              </span>

              {active && (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          );
        })}

        {/* ========================================
            SECONDARY NAVIGATION
            ======================================== */}
        {secondaryNavItems.length > 0 && (
          <>
            <div className="my-2 border-t" />

            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Lainnya
            </p>

            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onNav(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />

                  <span className="flex-1 text-left">
                    {item.label}
                  </span>

                  {active && (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              );
            })}
          </>
        )}
      </nav>

      {/* ==========================================
          LOGOUT
          ========================================== */}
      <div className="p-3 border-t">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              type="button"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Keluar
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Keluar dari akun?
              </AlertDialogTitle>

              <AlertDialogDescription>
                Kamu akan keluar dari akun ini dan kembali ke halaman masuk.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>
                Batal
              </AlertDialogCancel>

              <AlertDialogAction
                onClick={onLogout}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Ya, Keluar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
