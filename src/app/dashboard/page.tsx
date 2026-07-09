import { AppShell } from "@/components/app-shell";
import { RequestMap } from "@/components/request-map";
import { buildCoordinatorSummary } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userName = session?.user?.name || "Unknown";
  const userRole = session?.user?.role || "USER";

  const summary = await buildCoordinatorSummary();
  const dbRequests = await prisma.helpRequest.findMany({
    include: {
      statusHistory: {
        orderBy: { changedAt: "asc" },
      },
      assignedVolunteers: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const urgencyWeight: Record<string, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  const requests = dbRequests.map((req) => ({
    ...req,
    category: req.category as "MEDICAL" | "FOOD" | "WATER" | "SHELTER" | "RESCUE" | "OTHER",
    urgency: req.urgency as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    status: req.status as "RESOLVED" | "OPEN" | "CLAIMED" | "IN_PROGRESS" | "CANCELLED",
    photoUrl: req.photoUrl || undefined,
    volunteerId: req.assignedVolunteers ? req.assignedVolunteers.id : undefined,
    createdAt: req.createdAt.toISOString(),
    updatedAt: req.updatedAt.toISOString(),
    statusHistory: req.statusHistory.map((hist: any) => ({
      ...hist,
      note: hist.note || undefined,
      changedAt: hist.changedAt.toISOString(),
    })),
    volunteer: req.assignedVolunteers ? {
      id: req.assignedVolunteers.id,
      name: req.assignedVolunteers.name,
      image: req.assignedVolunteers.image,
      role: req.assignedVolunteers.role,
      latitude: req.assignedVolunteers.latitude,
      longitude: req.assignedVolunteers.longitude,
    } : null,
  })).sort((a, b) => {
    // 1. Prioritize open status
    const aIsOpen = a.status === "OPEN" ? 1 : 0;
    const bIsOpen = b.status === "OPEN" ? 1 : 0;
    if (aIsOpen !== bIsOpen) {
      return bIsOpen - aIsOpen;
    }
    // 2. Sort by Urgency priority weight
    const aWeight = urgencyWeight[a.urgency] ?? 0;
    const bWeight = urgencyWeight[b.urgency] ?? 0;
    if (aWeight !== bWeight) {
      return bWeight - aWeight;
    }
    // 3. Fallback to updatedAt desc
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <AppShell title="Live map dashboard" subtitle="Track nearby requests, claim work, and see the full response picture without leaving the map-first workspace.">
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-panel rounded-3xl p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--foreground)]/55">Operations overview</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-3xl">Hi {userName} ({userRole})</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--foreground)]/72 sm:text-base">
                Requests are grouped into a dedicated board, the map stays interactive, and analytics sit below as a clean secondary layer so the dashboard reads like a real operating console.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <MetricPill label="Total requests" value={summary.total} type="neutral" />
              <MetricPill label="Open" value={summary.open} type="warning" />
              <MetricPill label="Claimed" value={summary.claimed} type="info" />
              <MetricPill label="Resolved" value={summary.resolved} type="success" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between transition duration-300 hover:-translate-y-0.5 hover:border-indigo-400/40">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[color:var(--foreground)]/60">Active volunteers</p>
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-400 text-sm">
                  🤝
                </div>
              </div>
              <div>
                <p className="mt-4 text-4xl font-bold text-slate-900 dark:text-white tracking-tight">{summary.activeVolunteers}</p>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Helpers actively claiming work in the field.</p>
              </div>
            </div>
            <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between transition duration-300 hover:-translate-y-0.5 hover:border-emerald-400/40">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[color:var(--foreground)]/60">Resolution rate</p>
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 text-sm">
                  📈
                </div>
              </div>
              <div>
                <p className="mt-4 text-4xl font-bold text-slate-900 dark:text-white tracking-tight">{summary.resolutionRate}%</p>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Percentage of requests successfully resolved.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4 px-2">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--foreground)]/55">Requests</p>
              <h3 className="mt-1 text-xl font-semibold text-[color:var(--foreground)]">Live request board</h3>
            </div>
            <p className="hidden text-sm text-[color:var(--foreground)]/65 md:block">Filter, scan, and open any request without leaving the dashboard.</p>
          </div>
          <RequestMap requests={requests} />
        </section>
      </div>
    </AppShell>
  );
}

function MetricPill({ label, value, type = "neutral" }: { label: string; value: number; type?: "neutral" | "warning" | "info" | "success" }) {
  const styles = {
    neutral: "border-[color:var(--border)] bg-slate-900/40 text-slate-300",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    info: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  };

  return (
    <div className={`rounded-full border px-4 py-2 text-sm backdrop-blur-xl flex items-center gap-1.5 transition ${styles[type]}`}>
      <span className="opacity-75">{label}: </span>
      <span className="font-bold">{value}</span>
    </div>
  );
}