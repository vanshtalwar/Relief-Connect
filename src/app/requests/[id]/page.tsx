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
import { DeleteRequestButton } from "@/components/delete-request-button";

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

  const isAssigned = session?.user?.id && dbRequest.assignedVolunteers ? dbRequest.assignedVolunteers.id === session.user.id : false;

  const request = {
    ...dbRequest,
    photoUrl: dbRequest.photoUrl || undefined,
    volunteerId: dbRequest.assignedVolunteers ? dbRequest.assignedVolunteers.id : undefined,
    createdAt: dbRequest.createdAt.toISOString(),
    updatedAt: dbRequest.updatedAt.toISOString(),
    statusHistory: dbRequest.statusHistory.map((hist: any) => ({
      ...hist,
      note: hist.note || undefined,
      changedAt: hist.changedAt.toISOString(),
    })),
    volunteer: dbRequest.assignedVolunteers ? {
      id: dbRequest.assignedVolunteers.id,
      name: dbRequest.assignedVolunteers.name,
      image: dbRequest.assignedVolunteers.image,
      role: dbRequest.assignedVolunteers.role,
      latitude: dbRequest.assignedVolunteers.latitude,
      longitude: dbRequest.assignedVolunteers.longitude,
      isVerified: dbRequest.assignedVolunteers.isVerified,
      backgroundCheck: dbRequest.assignedVolunteers.backgroundCheck,
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
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left Column: Request details */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <section className={`bg-[color:var(--muted)] border ${request.isSOS ? 'border-red-500/50 shadow-lg shadow-red-500/10' : 'border-[color:var(--border)]'} rounded-xl shadow-sm overflow-hidden flex flex-col justify-between`}>
            <div className="border-b border-[color:var(--border)] px-5 py-4 bg-[color:var(--surface)] flex items-center justify-between">
              <h2 className="text-[14px] font-medium text-[color:var(--foreground)] tracking-wide">Request Detail</h2>
              {request.isSOS && (
                <div className="inline-flex items-center gap-1.5 rounded bg-red-500/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-red-500 uppercase border border-red-500/20 animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                  SOS Emergency
                </div>
              )}
            </div>
            <div className="p-5">
              <h2 className="text-2xl font-semibold text-[color:var(--foreground)] tracking-tight">{request.title}</h2>
              <p className="mt-3 text-[14px] text-[color:var(--foreground)]/70 leading-relaxed">{request.description}</p>
              
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Info label="Category" value={request.category} />
                <Info label="Urgency" value={request.urgency} />
                <Info label="Status" value={request.status} />
                <Info label="Coordinates" value={`${request.latitude.toFixed(4)}, ${request.longitude.toFixed(4)}`} />
                {request.locationName && (
                  <div className="sm:col-span-2 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
                    <p className="text-[10px] uppercase tracking-wider text-[color:var(--foreground)]/50 font-medium">Location Address</p>
                    <p className="mt-1.5 text-[13px] font-medium text-[color:var(--foreground)]">{request.locationName}</p>
                  </div>
                )}
              </div>
              
              {/* Participants */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
                  <p className="mb-3 text-[10px] uppercase tracking-wider text-[color:var(--foreground)]/50 font-medium">Requester</p>
                  <div className="flex items-center gap-3">
                    <Link href={`/profile/${request.requester.id}`} className="block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[color:var(--surface-strong)] transition hover:ring-2 hover:ring-[#38bdf8]">
                      {request.requester.image ? (
                        <img src={request.requester.image} alt={request.requester.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-[color:var(--foreground)]/50">👤</div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/profile/${request.requester.id}`} className="block truncate font-medium text-[13px] text-[color:var(--foreground)] transition hover:text-[#38bdf8]">
                        {request.requester.name}
                      </Link>
                      <div className="text-[11px] font-medium text-[#38bdf8] mt-0.5">{request.requester.role}</div>
                    </div>
                  </div>
                </div>

                {request.volunteer && (
                  <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
                    <p className="mb-3 text-[10px] uppercase tracking-wider text-[color:var(--foreground)]/50 font-medium">Assigned Volunteer</p>
                    <div className="flex items-center gap-3">
                      <Link href={`/profile/${request.volunteer.id}`} className="block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[color:var(--surface-strong)] transition hover:ring-2 hover:ring-[#3FA37E]">
                        {request.volunteer.image ? (
                          <img src={request.volunteer.image} alt={request.volunteer.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm text-[color:var(--foreground)]/50">👤</div>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/profile/${request.volunteer.id}`} className="block truncate font-medium text-[13px] text-[color:var(--foreground)] transition hover:text-[#3FA37E]">
                          {request.volunteer.name}
                        </Link>
                        <div className="text-[11px] font-medium text-[#3FA37E] mt-0.5">{request.volunteer.role}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-8">
                <p className="text-[13px] font-medium text-[color:var(--foreground)] mb-3">
                  {request.volunteer ? "Live Tracking Map" : "Location Map"}
                </p>
                <div className="rounded-xl overflow-hidden border border-[color:var(--border)] shadow-sm">
                  <RequestDetailMap
                    requestId={request.id}
                    victimLat={request.latitude}
                    victimLng={request.longitude}
                    locationName={request.locationName}
                    initialVolunteer={request.volunteer}
                  />
                </div>
              </div>
              
              {request.photoUrl && (
                <div className="mt-8">
                  <p className="text-[13px] font-medium text-[color:var(--foreground)] mb-3">Photo Verification</p>
                  <div className="overflow-hidden rounded-xl border border-[color:var(--border)] max-h-80 w-full bg-[color:var(--surface)]">
                    <img src={request.photoUrl} alt="Visual damage assessment" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              
              {request.status === "RESOLVED" && session?.user?.id && !existingReview && (session.user.id === request.requesterId || isAssigned) && (
                <div className="mt-8 border-t border-[color:var(--border)] pt-6">
                  <ReviewForm
                    requestId={request.id}
                    revieweeId={session.user.id === request.requesterId ? request.volunteerId! : request.requesterId}
                    role={session.user.id === request.requesterId ? "VICTIM" : "VOLUNTEER"}
                  />
                </div>
              )}
              
              {isCoordinator && !isResolved && (
                <div className="mt-8 border-t border-[color:var(--border)] pt-6">
                  <SuggestedVolunteers requestId={request.id} />
                </div>
              )}
              
              {isCoordinator && <DeleteRequestButton requestId={request.id} />}
            </div>
            
            <div className="mt-auto">
              {canClaim && (
                <div className="p-5 bg-[color:var(--surface)] border-t border-[color:var(--border)]">
                  <ClaimRequestForm requestId={request.id} actionLabel={actionLabel} />
                </div>
              )}
              {!isResolved && (isOwnRequest || isAssigned) && (
                <div className="p-5 bg-[color:var(--surface)] border-t border-[color:var(--border)]">
                  <ResolveRequestForm requestId={request.id} />
                </div>
              )}
            </div>
          </section>

          {!isOpen && session?.user?.id && (session.user.id === request.requesterId || isAssigned) && (
            <section className="bg-[color:var(--muted)] border border-[color:var(--border)] rounded-xl shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h3 className="text-[15px] font-medium text-[color:var(--foreground)]">Coordinate Response</h3>
                <p className="text-[color:var(--foreground)]/70 mt-1.5 text-[13px] leading-relaxed max-w-md">
                  Need to coordinate details or share a photo? Open the live chat room to communicate directly with {isAssigned ? "the requester" : "your volunteer"}.
                </p>
              </div>
              <Link 
                href={`/messages/${request.id}`}
                className="whitespace-nowrap flex items-center justify-center gap-2 rounded-md bg-[color:var(--foreground)] px-5 py-2.5 text-[13px] font-semibold text-[color:var(--background)] transition hover:opacity-80"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Open Live Chat
              </Link>
            </section>
          )}
        </div>

        {/* Right Column: Status timeline */}
        <div className="lg:col-span-1">
          <section className="bg-[color:var(--muted)] border border-[color:var(--border)] rounded-xl shadow-sm overflow-hidden sticky top-6">
            <div className="border-b border-[color:var(--border)] px-5 py-4 bg-[color:var(--surface)]">
              <h3 className="text-[13px] font-medium text-[color:var(--foreground)] tracking-wide">Status Timeline</h3>
            </div>
            <div className="p-5">
              <StatusTimeline events={request.statusHistory} volunteer={request.volunteer} />
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-[color:var(--foreground)]/50 font-medium">{label}</p>
      <p className="mt-1.5 text-[13px] font-medium text-[color:var(--foreground)]">{value}</p>
    </div>
  );
}