import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RequestCard } from "@/components/request-card";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function MyRequestsPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <AppShell title="My requests and claims" subtitle="A list-first view for tracking your submitted requests and active volunteer claims.">
        <div className="glass-panel flex flex-col items-center justify-center rounded-3xl p-12 text-center">
          <p className="text-sm text-slate-500">Please sign in to view your requests.</p>
        </div>
      </AppShell>
    );
  }

  // Find requests user created or is assigned to
  // And any requests claimed by user
  let claimedRequestIds: string[] = [];
  try {
    if ("requestClaim" in prisma && typeof (prisma as any).requestClaim?.findMany === "function") {
      const claims = await (prisma as any).requestClaim.findMany({
        where: { volunteerId: userId },
        select: { requestId: true },
      });
      claimedRequestIds = claims.map((c: any) => c.requestId);
    }
  } catch (err) {
    console.warn("Could not query requestClaim:", err);
  }

  const orConditions: any[] = [
    { requesterId: userId },
    { volunteerId: userId },
  ];

  if (claimedRequestIds.length > 0) {
    orConditions.push({ id: { in: claimedRequestIds } });
  }

  const dbRequests = await prisma.helpRequest.findMany({
    where: {
      OR: orConditions,
    },
    include: {
      assignedVolunteers: true,
    },
    orderBy: { updatedAt: "desc" },
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

  const userRole = session?.user?.role;
  const isVolunteer = userRole === "VOLUNTEER";
  const isVictim = userRole === "VICTIM" || userRole === "COORDINATOR";

  return (
    <AppShell title="My requests and claims" subtitle="A list-first view for tracking your submitted requests and active volunteer claims.">
      {/* Volunteer Banner: Redirect to profile to change role to victim */}
      {isVolunteer && (
        <div className="mb-6 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 sm:p-5 text-sky-950 dark:text-sky-100 backdrop-blur-md shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-xl">
              📢
            </span>
            <div>
              <p className="text-sm font-bold">Need emergency relief or aid?</p>
              <p className="text-xs text-slate-600 dark:text-sky-200/80 mt-0.5">
                To post a new help request, you must be in the Victim role. Redirect to your profile page to change your role to Victim.
              </p>
            </div>
          </div>
          <Link
            href="/profile"
            className="focus-ring whitespace-nowrap self-start sm:self-auto rounded-full bg-sky-500 hover:bg-sky-400 px-4 py-2 text-xs font-bold text-slate-950 transition shadow-sm hover:-translate-y-0.5 inline-flex items-center gap-2"
          >
            <span>Change Role in Profile</span>
            <span className="text-sm">→</span>
          </Link>
        </div>
      )}

      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[color:var(--foreground)] tracking-tight">Your Relief Activity</h2>
          <p className="text-xs text-[color:var(--foreground)]/60 mt-0.5">Track your submitted requests and active response team assignments.</p>
        </div>
        {isVictim && (
          <Link
            href="/requests/new"
            className="focus-ring self-start sm:self-auto inline-flex items-center gap-2 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2 text-xs uppercase tracking-wider transition shadow-md hover:-translate-y-0.5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Post New Request</span>
          </Link>
        )}
      </div>

      {requests.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} showActions={request.requesterId === userId || session?.user?.role === "COORDINATOR"} />
          ))}
        </div>
      ) : (
        <div className="glass-panel flex flex-col items-center justify-center rounded-3xl p-12 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--surface-strong)] text-slate-500 dark:text-slate-400 text-xl border border-[color:var(--border)] mb-4">
            📂
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No requests or claims yet</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
            You haven't submitted any requests or claimed any volunteer tasks. When you do, they will appear here.
          </p>
          {isVictim ? (
            <Link
              href="/requests/new"
              className="focus-ring mt-5 inline-flex items-center gap-2 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-5 py-2.5 text-xs uppercase tracking-wider transition shadow-md hover:-translate-y-0.5"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Post a Help Request</span>
            </Link>
          ) : (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/profile"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2 text-xs uppercase tracking-wider transition shadow-md hover:-translate-y-0.5"
              >
                <span>Switch to Victim to Post Request</span>
                <span>→</span>
              </Link>
              <Link
                href="/dashboard"
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] font-semibold px-4 py-2 text-xs uppercase tracking-wider transition shadow-sm hover:bg-[color:var(--surface-strong)]"
              >
                <span>Browse Requests</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}