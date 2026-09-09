import { AppShell } from "@/components/app-shell";
import { RequestCard } from "@/components/request-card";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Open Requests",
  description: "Browse open emergency relief requests or post a new request.",
};

export default async function RequestsPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const dbRequests = await prisma.helpRequest.findMany({
    where: { status: "OPEN" },
    include: {
      assignedVolunteers: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const requests = dbRequests.map((req) => ({
    ...req,
    category: req.category as "MEDICAL" | "FOOD" | "WATER" | "SHELTER" | "RESCUE" | "OTHER",
    urgency: req.urgency as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    status: req.status as "RESOLVED" | "OPEN" | "CLAIMED" | "IN_PROGRESS" | "CANCELLED",
    photoUrl: req.photoUrl || undefined,
    volunteerId: req.assignedVolunteers ? req.assignedVolunteers.id : undefined,
    createdAt: req.createdAt.toISOString(),
    updatedAt: req.updatedAt.toISOString(),
  }));

  return (
    <AppShell title="Open Relief Requests" subtitle="Browse active emergency assistance calls and submit new requests.">
      {/* Post Request Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-5 py-4 text-sky-950 dark:text-sky-100 backdrop-blur-md shadow-sm mb-6">
        <div className="flex items-start sm:items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-lg">
            🚨
          </span>
          <div>
            <p className="text-sm font-semibold">Need emergency relief or assistance?</p>
            <p className="text-xs text-slate-600 dark:text-sky-200/80">
              Submit a new request for yourself or for someone else in need of medical aid, food, water, or shelter.
            </p>
          </div>
        </div>
        <Link
          href="/requests/new"
          className="focus-ring whitespace-nowrap rounded-full bg-sky-500 hover:bg-sky-400 px-4 py-2 text-xs font-bold text-slate-950 transition shadow-sm hover:-translate-y-0.5"
        >
          Post New Request →
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Active Requests ({requests.length})</h2>
          <p className="text-xs text-[color:var(--foreground)]/60">Community members awaiting volunteer assistance</p>
        </div>
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-sky-500 hover:text-sky-400 transition"
        >
          View on Map Dashboard →
        </Link>
      </div>

      {requests.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} showActions={request.requesterId === userId || session?.user?.role === "COORDINATOR"} />
          ))}
        </div>
      ) : (
        <div className="glass-panel flex flex-col items-center justify-center rounded-3xl p-12 text-center">
          <p className="text-sm text-slate-500">No open requests at the moment.</p>
        </div>
      )}
    </AppShell>
  );
}
