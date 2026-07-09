import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import Link from "next/link";

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    notFound();
  }

  return (
    <AppShell title={`${user.name}'s Profile`} subtitle="Public responder details">
      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="glass-panel rounded-3xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Account details</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <Row label="Name" value={user.name || "Unknown"} />
              <Row label="Role" value={user.role} />
              
              <div className="flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <dt className="text-slate-500 dark:text-slate-400">Trust & Safety</dt>
                <dd className="flex flex-wrap gap-2 mt-1">
                  {user.isVerified ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      ID Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-500">Unverified ID</span>
                  )}
                  {user.backgroundCheck ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      Background Check Passed
                    </span>
                  ) : null}
                </dd>
              </div>

              <div className="flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <dt className="text-slate-500 dark:text-slate-400">Skills</dt>
                <dd className="flex flex-wrap gap-2 mt-1">
                  {user.skills && user.skills.length > 0 ? (
                    user.skills.map(skill => (
                      <span key={skill} className="inline-flex rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-600 dark:text-sky-400 border border-sky-500/20">{skill}</span>
                    ))
                  ) : (
                    <span className="text-slate-400 text-xs italic">No skills listed</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Profile photo</h2>
            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-sky-400/20 bg-slate-900/10 shadow-xl flex items-center justify-center">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={`${user.name}'s Profile Avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-4xl text-slate-400">👤</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <div className="mt-6">
        <Link
          href="/dashboard"
          className="focus-ring inline-flex items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)]/90 transition hover:border-sky-400/40 hover:bg-[color:var(--surface-strong)]"
        >
          Back to Dashboard
        </Link>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}
