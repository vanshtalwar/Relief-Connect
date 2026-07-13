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
      <div className="flex flex-col gap-5">
        <AnalyticsDashboard summary={summary} />
        
        <div className="grid gap-5 lg:grid-cols-3 items-start">
          {/* Column 1: Broadcast Alert */}
          <section className="bg-[#1A1D24] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
            <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-3 bg-[#13151A]">
              <h2 className="text-[13px] font-medium text-[#EDEDED] tracking-wide">Broadcast Alert</h2>
            </div>
            <div className="p-4 flex-1">
              <p className="mb-4 text-[12px] text-[#A0A0A0] leading-relaxed">Target a geographic zone and push an emergency banner over the realtime channel.</p>
              <BroadcastAlertForm />
            </div>
          </section>
          
          {/* Column 2: Notifications / Activity Log */}
          <div className="h-full">
            <NotificationDrawer />
          </div>

          {/* Column 3: Verification Queue */}
          <section className="bg-[#1A1D24] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
            <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-3 bg-[#13151A]">
              <h2 className="text-[13px] font-medium text-[#EDEDED] tracking-wide">Verification Queue</h2>
            </div>
            <div className="p-4 flex-1 overflow-x-auto">
              <VerificationQueue />
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}