import { AppShell } from "@/components/app-shell";
import { RequestMap } from "@/components/request-map";
import { buildCoordinatorSummary } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { SOSButton } from "@/components/sos-button";
import { DashboardStats } from "@/components/dashboard-stats";

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

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
      <div className="space-y-8 animate-in fade-in duration-500">
        
        {/* Welcome Hero Banner */}
        <section className="relative overflow-hidden bg-[color:var(--muted)] border border-[color:var(--border)] rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#38bdf8] opacity-[0.03] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#3FA37E] opacity-[0.03] rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[color:var(--surface)] border border-[color:var(--border)] mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--foreground)]/70 font-medium">Operations Live</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-[color:var(--foreground)] sm:text-4xl">
                Hi {userName} <span className="text-[color:var(--foreground)]/50 font-medium text-2xl">({userRole})</span>
              </h2>
            </div>
            
            {/* Actions aligned to the right corner of the banner */}
            <div className="flex items-center gap-3">
              <SOSButton />
              <Link
                href="/requests/new"
                className="focus-ring flex items-center gap-2 rounded-full bg-[color:var(--foreground)] px-5 py-2 text-[12px] font-bold uppercase tracking-wider text-[color:var(--background)] transition hover:-translate-y-0.5 hover:bg-opacity-80 shadow-md"
              >
                <PlusIcon />
                <span>New Request</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Global Unified Metrics Grid */}
        <DashboardStats summary={summary} />

        {/* Map Workspace */}
        <section className="space-y-4 pt-2">
          <div className="flex items-end justify-between gap-4 px-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--foreground)]/50 font-medium">Workspace</p>
              <h3 className="mt-1 text-[18px] font-semibold text-[color:var(--foreground)]">Live Request Board</h3>
            </div>
            <p className="hidden text-[13px] text-[color:var(--foreground)]/70 md:block">Filter, scan, and open any request without leaving the dashboard.</p>
          </div>
          <div className="rounded-2xl overflow-hidden border border-[color:var(--border)] shadow-lg transition-all duration-500 hover:border-[color:var(--border-strong)] hover:shadow-[0_0_40px_-15px_rgba(56,189,248,0.1)]">
            <RequestMap requests={requests} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
