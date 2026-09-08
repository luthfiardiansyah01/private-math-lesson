import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AppShell } from "@/components/app-shell";
import { ViewRouter } from "@/components/view-router";
import type { SessionUser } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return <AuthScreen />;
  }

  const u = session.user as any;
  if (!u.id || !u.role) {
    return <AuthScreen />;
  }

  // Fetch the freshest user record (name may have changed) — lightweight query.
  const dbUser = await db.user.findUnique({
    where: { id: u.id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!dbUser) {
    return <AuthScreen />;
  }

  const user: SessionUser = {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role as "STUDENT" | "TUTOR" | "PARENT",
  };

  return (
    <AppShell user={user}>
      <ViewRouter user={user} />
    </AppShell>
  );
}
