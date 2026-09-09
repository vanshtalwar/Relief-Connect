import { AppShell } from "@/components/app-shell";
import { MyRequestsView } from "@/components/my-requests-view";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function MyRequestsPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <AppShell
        title="My Requests & Activities"
        subtitle="Track your relief requests, volunteer commitments, and live emergency actions."
      >
        <div className="glass-panel flex flex-col items-center justify-center rounded-3xl p-8 sm:p-12 text-center">
          <p className="text-sm text-slate-500">Please sign in to view your requests.</p>
        </div>
      </AppShell>
    );
  }

  // Find requests user created or is assigned to, or claimed as volunteer
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
      claims: {
        include: {
          volunteer: {
            select: { id: true, name: true },
          },
        },
      },
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
    locationName: req.locationName || undefined,
    responders: [
      ...(req.assignedVolunteers ? [{ id: req.assignedVolunteers.id, name: req.assignedVolunteers.name }] : []),
      ...((req as any).claims?.map((c: any) => ({ id: c.volunteer.id, name: c.volunteer.name })) || []),
    ].filter((v, idx, arr) => arr.findIndex((item) => item.id === v.id) === idx),
    createdAt: req.createdAt.toISOString(),
    updatedAt: req.updatedAt.toISOString(),
  }));

  const userRole = session?.user?.role;
  const isVolunteer = userRole === "VOLUNTEER";
  const isVictim = userRole === "VICTIM" || userRole === "COORDINATOR";

  return (
    <AppShell
      title="My Requests & Activities"
      subtitle="Track your relief requests, volunteer commitments, and live emergency actions."
    >
      <MyRequestsView
        requests={requests}
        currentUserId={userId}
        userRole={userRole}
        isVolunteer={isVolunteer}
        isVictim={isVictim}
      />
    </AppShell>
  );
}