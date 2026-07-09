import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { StatusTimeline } from "@/components/status-timeline";
import { ClaimRequestForm } from "@/components/claim-request-form";
import { ResolveRequestForm } from "@/components/resolve-request-form";
import { prisma } from "@/lib/prisma";
import { RequestDetailMap } from "@/components/request-detail-map";
import { ReviewForm } from "@/components/review-form";
import { SuggestedVolunteers } from "@/components/suggested-volunteers";

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  const dbRequest = await prisma.helpRequest.findUnique({
    where: { id },
    include: {
      statusHistory: {
        orderBy: { changedAt: "asc" },
      },
      assignedVolunteers: true,
      requester: {
        select: { id: true, name: true, image: true, role: true }
      }
    },
  });

  if (!dbRequest) {
    notFound();
  }

  const existingReview = session?.user?.id ? await prisma.review.findFirst({
    where: {
      requestId: id,
      reviewerId: session.user.id,
    }
  }) : null;

  const isAssigned = session?.user?.id ? dbRequest.assignedVolunteers.some(v => v.id === session.user.id) : false;

  const request = {
    ...dbRequest,
    photoUrl: dbRequest.photoUrl || undefined,
    volunteerId: dbRequest.assignedVolunteers.length > 0 ? dbRequest.assignedVolunteers[0].id : undefined,
    createdAt: dbRequest.createdAt.toISOString(),
    updatedAt: dbRequest.updatedAt.toISOString(),
    statusHistory: dbRequest.statusHistory.map((hist: any) => ({
      ...hist,
      note: hist.note || undefined,
      changedAt: hist.changedAt.toISOString(),
    })),
    volunteer: dbRequest.assignedVolunteers.length > 0 ? {
      id: dbRequest.assignedVolunteers[0].id,
      name: dbRequest.assignedVolunteers[0].name,
      image: dbRequest.assignedVolunteers[0].image,
      role: dbRequest.assignedVolunteers[0].role,
      latitude: dbRequest.assignedVolunteers[0].latitude,
      longitude: dbRequest.assignedVolunteers[0].longitude,
      isVerified: dbRequest.assignedVolunteers[0].isVerified,
      backgroundCheck: dbRequest.assignedVolunteers[0].backgroundCheck,
    } : null,
  };

  const isVolunteer = session?.user?.role === "VOLUNTEER";
  const isCoordinator = session?.user?.role === "COORDINATOR";
  const isOpen = request.status === "OPEN";
  const isResolved = request.status === "RESOLVED" || request.status === "CANCELLED";
  const isOwnRequest = session?.user?.id && request.requesterId === session.user.id;
  const canClaim = isVolunteer && !isResolved && !isOwnRequest && !isAssigned;
  const actionLabel = isOpen ? "Claim Request" : "Join Team";

  return (
    <AppShell title={request.title} subtitle="Request detail, status history, and claim flow live in the same panel so responders can move quickly.">
      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <section className={`glass-panel rounded-3xl p-5 flex flex-col justify-between ${request.isSOS ? 'border-2 border-red-500 shadow-red-500/20' : ''}`}>
          <div>
            {request.isSOS && (
              <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-md animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                SOS EMERGENCY
              </div>
            )}
            <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--foreground)]/55">Request detail</p>
            <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">{request.title}</h2>
            <p className="mt-4 text-[color:var(--foreground)]/80 leading-relaxed">{request.description}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Info label="Category" value={request.category} />
              <Info label="Urgency" value={request.urgency} />
              <Info label="Status" value={request.status} />
              <Info label="Location" value={`${request.latitude.toFixed(4)}, ${request.longitude.toFixed(4)}`} />
              {request.locationName && (
                <div className="sm:col-span-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--foreground)]/50">Location Address</p>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">{request.locationName}</p>
                </div>
              )}
            </div>
            
            {/* Participants */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[color:var(--foreground)]/50">Requester</p>
                <div className="flex items-center gap-3">
                  <Link href={`/profile/${request.requester.id}`} className="block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 transition hover:ring-2 hover:ring-sky-400">
                    {request.requester.image ? (
                      <img src={request.requester.image} alt={request.requester.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">👤</div>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/profile/${request.requester.id}`} className="block truncate font-semibold text-sm text-[color:var(--foreground)] transition hover:text-sky-500">
                      {request.requester.name}
                    </Link>
                    <div className="text-xs font-medium text-sky-600 dark:text-sky-400">{request.requester.role}</div>
                  </div>
                </div>
              </div>

              {request.volunteer && (
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                  <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[color:var(--foreground)]/50">Assigned Volunteer</p>
                  <div className="flex items-center gap-3">
                    <Link href={`/profile/${request.volunteer.id}`} className="block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 transition hover:ring-2 hover:ring-sky-400">
                      {request.volunteer.image ? (
                        <img src={request.volunteer.image} alt={request.volunteer.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">👤</div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/profile/${request.volunteer.id}`} className="block truncate font-semibold text-sm text-[color:var(--foreground)] transition hover:text-sky-500">
                        {request.volunteer.name}
                      </Link>
                      <div className="text-xs font-medium text-sky-600 dark:text-sky-400">{request.volunteer.role}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6">
              <p className="text-sm font-medium text-[color:var(--foreground)]/60 mb-2">
                {request.volunteer ? "Live Tracking Map" : "Location Map"}
              </p>
              <RequestDetailMap
                requestId={request.id}
                victimLat={request.latitude}
                victimLng={request.longitude}
                locationName={request.locationName}
                initialVolunteer={request.volunteer}
              />
            </div>
            {request.photoUrl && (
              <div className="mt-6">
                <p className="text-sm font-medium text-[color:var(--foreground)]/60 mb-2">Photo Verification</p>
                <div className="overflow-hidden rounded-3xl border border-[color:var(--border)] max-h-80 w-full bg-slate-900/10">
                  <img src={request.photoUrl} alt="Visual damage assessment" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            
            {request.status === "RESOLVED" && session?.user?.id && !existingReview && (session.user.id === request.requesterId || isAssigned) && (
              <ReviewForm
                requestId={request.id}
                revieweeId={session.user.id === request.requesterId ? request.volunteerId! : request.requesterId}
                role={session.user.id === request.requesterId ? "VICTIM" : "VOLUNTEER"}
              />
            )}
            {isCoordinator && !isResolved && <SuggestedVolunteers requestId={request.id} />}
          </div>
          {canClaim && <ClaimRequestForm requestId={request.id} actionLabel={actionLabel} />}
          {!isResolved && (isOwnRequest || isAssigned) && (
            <ResolveRequestForm requestId={request.id} />
          )}
        </section>
        <section className="glass-panel rounded-3xl p-5">
          <h3 className="text-lg font-semibold text-[color:var(--foreground)]">Status timeline</h3>
          <div className="mt-4">
            <StatusTimeline events={request.statusHistory} volunteer={request.volunteer} />
          </div>
        </section>
      </div>

      {!isOpen && session?.user?.id && (session.user.id === request.requesterId || isAssigned) && (
        <div className="mt-4">
          <section className="glass-panel rounded-3xl p-6 flex flex-col items-center justify-center text-center">
            <h3 className="text-xl font-semibold text-[color:var(--foreground)] mb-2">Coordinate Response</h3>
            <p className="text-[color:var(--foreground)]/70 mb-6 text-sm max-w-md">
              Need to coordinate details or share a photo? Open the live chat room to communicate directly with {isAssigned ? "the requester" : "your volunteer"}.
            </p>
            <Link 
              href={`/messages/${request.id}`}
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-sky-400"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Open Live Chat
            </Link>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--foreground)]/50">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">{value}</p>
    </div>
  );
}