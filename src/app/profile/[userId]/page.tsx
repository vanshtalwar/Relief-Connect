import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { format } from "date-fns";

export default async function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <AppShell title="Unauthorized" subtitle="You must be logged in to view profiles.">
        <div className="glass-panel p-8 text-center text-red-500">Access Denied</div>
      </AppShell>
    );
  }

  const userProfile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      image: true,
      skills: true,
      inventory: true,
      isVerified: true,
      backgroundCheck: true,
      createdAt: true,
      // Calculate average rating
      reviewsReceived: {
        select: {
          rating: true,
          comment: true,
          createdAt: true,
          reviewer: {
            select: { name: true, image: true, role: true }
          }
        },
        orderBy: { createdAt: "desc" }
      },
      _count: {
        select: {
          requests: true, // as victim
          claimedRequests: true, // as volunteer
        }
      }
    }
  });

  if (!userProfile) {
    notFound();
  }

  const averageRating = userProfile.reviewsReceived.length > 0 
    ? userProfile.reviewsReceived.reduce((acc, rev) => acc + rev.rating, 0) / userProfile.reviewsReceived.length
    : 0;

  const skillsArray = Array.isArray(userProfile.skills) ? userProfile.skills as string[] : [];
  const inventoryArray = Array.isArray(userProfile.inventory) ? userProfile.inventory as string[] : [];

  return (
    <AppShell title={`${userProfile.name}'s Profile`} subtitle="Public profile and activity history.">
      <div className="mx-auto max-w-4xl space-y-6">
        
        {/* Header / Identity */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-slate-200 bg-slate-100 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            {userProfile.image ? (
              <img src={userProfile.image} alt={userProfile.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl text-slate-400">👤</div>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{userProfile.name}</h1>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                {userProfile.role}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Member since {format(new Date(userProfile.createdAt), "MMMM yyyy")}</p>
            
            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-4">
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                ⭐ <span className="font-bold">{averageRating > 0 ? averageRating.toFixed(1) : "New"}</span>
                <span className="text-slate-400">({userProfile.reviewsReceived.length} reviews)</span>
              </div>
              <div className="flex items-center gap-2">
                {userProfile.isVerified && (
                  <span className="flex items-center gap-1 rounded-md bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Verified ID
                  </span>
                )}
                {userProfile.backgroundCheck && (
                  <span className="flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    Background Checked
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-row sm:flex-col gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{userProfile._count.requests}</div>
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Requests</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{userProfile._count.claimedRequests}</div>
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Helped</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Skills & Inventory */}
          <div className="glass-panel rounded-3xl p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Capabilities</h3>
            <div className="space-y-6">
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Skills</h4>
                {skillsArray.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skillsArray.map((skill) => (
                      <span key={skill} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic text-slate-400">No skills listed.</p>
                )}
              </div>
              
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Available Resources</h4>
                {inventoryArray.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {inventoryArray.map((item) => (
                      <span key={item} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic text-slate-400">No resources listed.</p>
                )}
              </div>
            </div>
          </div>

          {/* Reviews */}
          <div className="glass-panel rounded-3xl p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Recent Feedback</h3>
            {userProfile.reviewsReceived.length > 0 ? (
              <div className="space-y-4">
                {userProfile.reviewsReceived.map((review, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        {review.reviewer.image ? (
                          <img src={review.reviewer.image} alt={review.reviewer.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs">👤</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{review.reviewer.name}</p>
                          <span className="text-xs text-slate-400">{format(new Date(review.createdAt), "MMM d")}</span>
                        </div>
                        <div className="flex text-yellow-500 text-xs">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={i < review.rating ? "text-yellow-400" : "text-slate-200 dark:text-slate-700"}>★</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">"{review.comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-slate-400">No feedback received yet.</p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
