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

  const dbRequests = await prisma.helpRequest.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { volunteerId: userId },
        ],
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

  return (
    <AppShell title="My requests and claims" subtitle="A list-first view for tracking your submitted requests and active volunteer claims.">
      {requests.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} showActions={request.requesterId === userId} />
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
        </div>
      )}
    </AppShell>
  );
}