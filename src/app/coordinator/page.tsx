import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { NotificationDrawer } from "@/components/notification-drawer";
import { BroadcastAlertForm } from "@/components/broadcast-alert-form";
import { VerificationQueue } from "@/components/verification-queue";
import { buildCoordinatorSummary } from "@/lib/analytics";

export default async function CoordinatorPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "COORDINATOR") {
    redirect("/dashboard");
  }

  const summary = await buildCoordinatorSummary();

  return (
    <AppShell title="Coordinator command center" subtitle="Verification queue, analytics, alerts, and live operational context sit behind one role-protected entry point.">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AnalyticsDashboard summary={summary} />
        <div className="space-y-4">
          <section className="glass-panel rounded-3xl p-5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Broadcast alert</h2>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">Target a geographic zone and push an emergency banner over the realtime channel.</p>
            <BroadcastAlertForm />
          </section>
          <section className="glass-panel rounded-3xl p-5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Verification queue</h2>
            <VerificationQueue />
          </section>
          <NotificationDrawer />
        </div>
      </div>
    </AppShell>
  );
}