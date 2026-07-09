import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildCoordinatorSummary } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session;

  const summary = await buildCoordinatorSummary();

  const activeRequestsCount = await prisma.helpRequest.count({
    where: { status: { in: ["OPEN", "CLAIMED", "IN_PROGRESS"] } },
  });
  const openAlertsCount = await prisma.alert.count();
  let unreadNotificationsCount = 0;
  if (session?.user?.id) {
    unreadNotificationsCount = await prisma.notification.count({
      where: { userId: session.user.id, read: false },
    });
  }

  const stats = [
    { label: "Active requests", value: activeRequestsCount.toString() },
    { label: "Open alerts", value: openAlertsCount.toString() },
    { label: "Unread notifications", value: unreadNotificationsCount.toString() },
    { label: "Resolution rate", value: `${summary.resolutionRate}%` },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute left-[-12rem] top-24 -z-10 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl" />
      <div className="absolute right-[-8rem] top-1/3 -z-10 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />



      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 mt-14">
        <section className="glass-panel rounded-3xl p-6 sm:p-8 lg:p-10">
          {/* Header Row: Aligned to the top right of the card component */}
          <div className="flex items-center justify-between border-b border-[color:var(--border)] pb-4 mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-200">
              ReliefConnect live ops
            </div>
            <div className="flex gap-2.5">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className="focus-ring inline-flex items-center justify-center rounded-full bg-sky-400 px-4 py-1.5 text-xs sm:text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    className="focus-ring inline-flex items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-1.5 text-xs sm:text-sm font-semibold text-[color:var(--foreground)]/90 transition hover:border-sky-400/40 hover:bg-[color:var(--surface-strong)]"
                  >
                    View profile
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="focus-ring inline-flex items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-1.5 text-xs sm:text-sm font-semibold text-[color:var(--foreground)]/90 transition hover:border-sky-400/40 hover:bg-[color:var(--surface-strong)]"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="focus-ring inline-flex items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-1.5 text-xs sm:text-sm font-semibold text-[color:var(--foreground)]/90 transition hover:border-sky-400/40 hover:bg-[color:var(--surface-strong)]"
                  >
                    Create account
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-5">
              <h1 className="text-4xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-5xl lg:text-6xl">
                Coordinate disaster response with a map-first, always-updated control room.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-700 dark:text-slate-300 sm:text-lg">
                ReliefConnect keeps victims, volunteers, and coordinators in the same flow so requests, claims, alerts, and notifications stay visible as they change.
              </p>
              <div className="h-2" />
            </div>

            {isLoggedIn ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:w-[28rem]">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{stat.label}</div>
                    <div className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">{stat.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col justify-center rounded-2xl border border-sky-500/20 bg-[color:var(--surface)] p-6 space-y-4 lg:w-[28rem]">
                <h3 className="text-lg font-semibold text-[color:var(--foreground)]">How ReliefConnect works</h3>
                <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                  <div className="flex gap-2">
                    <span className="text-sky-600 dark:text-sky-400 font-bold">1.</span>
                    <span>Victims submit requests for food, water, medical aid, or shelter.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-sky-600 dark:text-sky-400 font-bold">2.</span>
                    <span>Nearby volunteers claim requests and coordinate via the interactive map.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-sky-600 dark:text-sky-400 font-bold">3.</span>
                    <span>Coordinators view analytics and allocate critical resources.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {isLoggedIn ? (
          <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="glass-panel rounded-3xl p-6 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Current response picture</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Demo data is wired through the same components used in the authenticated workspace.</p>
                </div>
                <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-200">
                  Live
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                  <div className="text-sm text-slate-505 dark:text-slate-400">Critical requests</div>
                  <div className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                    {await prisma.helpRequest.count({ where: { urgency: "CRITICAL" } })}
                  </div>
                </div>
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                  <div className="text-sm text-slate-505 dark:text-slate-400">Claimed or in progress</div>
                  <div className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                    {await prisma.helpRequest.count({ where: { status: { in: ["CLAIMED", "IN_PROGRESS"] } } })}
                  </div>
                </div>
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                  <div className="text-sm text-slate-505 dark:text-slate-400">Average response</div>
                  <div className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">{summary.averageResponseMinutes} min</div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {(await prisma.helpRequest.findMany({
                  take: 3,
                  orderBy: { updatedAt: "desc" },
                })).map((request) => (
                  <div key={request.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                    <div>
                      <div className="text-sm font-medium text-[color:var(--foreground)]">{request.title}</div>
                      <div className="mt-1 text-sm text-slate-550 dark:text-slate-400">{request.description}</div>
                    </div>
                    <div className="rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-200">
                      {request.status}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <aside className="glass-panel rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-sm">
              <div>
                <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Real-time Operations Engine</h2>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  ReliefConnect drives coordination via live geolocation telemetry, reverse geocoding, and offline synchronization queues.
                </p>

                <div className="mt-6 space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  <div className="flex gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 hover:border-sky-400/35 transition">
                    <span className="text-xl">📍</span>
                    <div>
                      <strong className="text-[color:var(--foreground)]">Geocoded Mapping</strong>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pinnable coordinates automatically reverse-geocode to precise street addresses using Nominatim API mapping.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 hover:border-emerald-400/35 transition">
                    <span className="text-xl">⚡</span>
                    <div>
                      <strong className="text-[color:var(--foreground)]">Live GPS Heartbeat</strong>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tracks en-route volunteers dynamically via background browser geolocation, displaying real-time proximity distance.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 hover:border-amber-400/35 transition">
                    <span className="text-xl">📶</span>
                    <div>
                      <strong className="text-[color:var(--foreground)]">Offline Resilience</strong>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Queues operations locally in IndexedDB to automatically sync updates when data connections recover.</p>
                    </div>
                  </div>
                </div>
              </div>

            </aside>

          </section>
        ) : (
          <section className="grid gap-6 md:grid-cols-3">
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-3 transition duration-300 hover:-translate-y-1 hover:border-sky-400/40">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-600 dark:text-sky-400 text-lg">
                📍
              </div>
              <h3 className="text-lg font-semibold text-[color:var(--foreground)]">Hyperlocal Mapping</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Geo-targeted request pins help volunteers instantly locate people in need. Filter by category, priority, and proximity to coordinate local support.
              </p>
            </div>
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-3 transition duration-300 hover:-translate-y-1 hover:border-emerald-400/40">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 text-lg">
                ⚡
              </div>
              <h3 className="text-lg font-semibold text-[color:var(--foreground)]">Instant Status Updates</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Real-time push notifications keep everyone updated. See exactly when a request is claimed, in progress, or successfully resolved.
              </p>
            </div>
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-3 transition duration-300 hover:-translate-y-1 hover:border-amber-400/40">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-600 dark:text-amber-400 text-lg">
                📶
              </div>
              <h3 className="text-lg font-semibold text-[color:var(--foreground)]">Offline Synchronization</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Offline-first architecture caches maps and logs actions locally. Changes sync automatically when connection restores.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
