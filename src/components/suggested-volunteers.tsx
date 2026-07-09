"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Suggestion = {
  volunteer: { id: string; name: string; skills: string[]; isVerified: boolean; backgroundCheck: boolean };
  distanceKm: number;
  skillMatchScore: number;
  finalScore: number;
};

export function SuggestedVolunteers({ requestId }: { requestId: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/volunteers/suggest?requestId=${requestId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load suggestions");
        return res.json();
      })
      .then(data => {
        setSuggestions(data.suggestions || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [requestId]);

  const handleAssign = async (volunteerId: string) => {
    setAssigningId(volunteerId);
    try {
      const res = await fetch(`/api/requests/${requestId}/claim`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "Dispatched by Coordinator", volunteerId }),
      });
      if (res.ok) {
        setSuggestions(prev => prev.filter(s => s.volunteer.id !== volunteerId));
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to dispatch volunteer");
      }
    } catch (err) {
      alert("Failed to dispatch volunteer");
    } finally {
      setAssigningId(null);
    }
  };

  if (isLoading) return <div className="p-5 text-sm text-[color:var(--foreground)]/60 animate-pulse">Running AI assignment algorithm...</div>;
  if (error) return <div className="p-5 text-sm text-red-500">{error}</div>;
  if (suggestions.length === 0) return <div className="p-5 text-sm text-[color:var(--foreground)]/60">No available volunteers found nearby.</div>;

  return (
    <div className="space-y-4 mt-6 border-t border-[color:var(--border)] pt-5">
      <h3 className="font-semibold text-[color:var(--foreground)] flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
        Smart Routing Suggestions
      </h3>
      <p className="text-xs text-[color:var(--foreground)]/60">Ranked by proximity, skill match, and verification trust level.</p>
      
      <div className="space-y-3 mt-4">
        {suggestions.map(({ volunteer, distanceKm, skillMatchScore }) => (
          <div key={volunteer.id} className="flex items-center justify-between gap-4 rounded-xl border border-[color:var(--border)] bg-slate-900/20 p-4 transition hover:border-indigo-400/30">
            <div>
              <div className="flex items-center gap-2">
                <Link href={`/profile/${volunteer.id}`} className="font-medium text-sky-400 hover:underline">{volunteer.name}</Link>
                {volunteer.isVerified && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white" title="Identity Verified"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>}
                {volunteer.backgroundCheck && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white" title="Background Check Passed"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>}
              </div>
              <p className="text-xs text-[color:var(--foreground)]/60 mt-1.5 font-medium">
                {distanceKm.toFixed(1)} km away <span className="mx-1">•</span> {Math.round(skillMatchScore * 100)}% Skill Match
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(volunteer.skills || []).slice(0,3).map(skill => (
                  <span key={skill} className="text-[10px] uppercase tracking-wider bg-[color:var(--surface-strong)] px-1.5 py-0.5 rounded text-[color:var(--foreground)]/70">{skill}</span>
                ))}
              </div>
            </div>
            <button
              onClick={() => handleAssign(volunteer.id)}
              disabled={assigningId === volunteer.id}
              className="focus-ring whitespace-nowrap rounded-lg bg-indigo-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-indigo-400 transition hover:bg-indigo-500/20 disabled:opacity-50"
            >
              {assigningId === volunteer.id ? "Assigning..." : "Dispatch"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
