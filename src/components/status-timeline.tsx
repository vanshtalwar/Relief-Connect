import Link from "next/link";
import { requestStatusLabels, type RequestStatus } from "@/lib/constants";

export function StatusTimeline({ 
  events,
  volunteer,
  responders,
}: { 
  events: Array<{ status: RequestStatus; changedAt: string; note?: string }>;
  volunteer?: { id: string; name: string; isVerified?: boolean; backgroundCheck?: boolean } | null;
  responders?: Array<{ id: string; name: string; isVerified?: boolean; backgroundCheck?: boolean }>;
}) {
  return (
    <div className="space-y-3">
      {events.map((event, index) => (
        <div key={`${event.status}-${event.changedAt}-${index}`} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="h-3 w-3 rounded-full bg-sky-400" />
            {index < events.length - 1 ? <span className="mt-1 h-full w-px flex-1 bg-[color:var(--border)]" /> : null}
          </div>
          <div className="pb-3">
            <p className="font-semibold text-[color:var(--foreground)]">{requestStatusLabels[event.status]}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">{new Date(event.changedAt).toLocaleString()}</p>
            {event.note ? <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{event.note}</p> : null}
            {event.status === "CLAIMED" && (
              responders && responders.length > 0 ? (
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-[color:var(--foreground)]">Response Team ({responders.length}):</span>{" "}
                  {responders.map((resp, i) => (
                    <span key={resp.id}>
                      {i > 0 ? ", " : ""}
                      <Link href={`/profile/${resp.id}`} className="text-sky-500 hover:underline font-medium inline-flex items-center gap-0.5">
                        {resp.name}
                        {resp.isVerified && <span className="text-[10px] text-emerald-400">✓</span>}
                      </Link>
                    </span>
                  ))}
                </div>
              ) : volunteer ? (
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Claimed by volunteer: <Link href={`/profile/${volunteer.id}`} className="text-sky-500 hover:underline font-medium inline-flex items-center gap-1.5">{volunteer.name}
                  {volunteer.isVerified && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white" title="Identity Verified">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </span>
                  )}
                  {volunteer.backgroundCheck && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white" title="Background Check Passed">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </span>
                  )}
                  </Link>
                </div>
              ) : null
            )}
          </div>
        </div>
      ))}
    </div>
  );
}