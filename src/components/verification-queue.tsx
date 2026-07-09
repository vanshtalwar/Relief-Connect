"use client";

import { useEffect, useState } from "react";

type PendingVolunteer = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
};

export function VerificationQueue() {
  const [volunteers, setVolunteers] = useState<PendingVolunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadPending() {
      try {
        const res = await fetch("/api/volunteers/pending");
        if (res.ok) {
          const data = await res.json();
          setVolunteers(data.volunteers || []);
        }
      } catch (err) {
        console.error("Failed to load pending volunteers:", err);
      } finally {
        setLoading(false);
      }
    }
    void loadPending();
  }, []);

  const handleApprove = async (id: string) => {
    if (approvingId) return;
    setApprovingId(id);

    try {
      const res = await fetch(`/api/volunteers/${id}/verify`, {
        method: "PATCH",
      });

      if (res.ok) {
        setVolunteers((prev) => prev.filter((v) => v.id !== id));
      } else {
        alert("Failed to verify volunteer.");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred while verifying.");
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mt-4 flex h-32 items-center justify-center rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] text-slate-500">
        Loading pending verifications...
      </div>
    );
  }

  if (volunteers.length === 0) {
    return (
      <div className="mt-4 flex h-32 flex-col items-center justify-center rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 text-center">
        <span className="text-2xl mb-2">✅</span>
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Queue is clear!</span>
        <span className="text-xs text-slate-500 mt-1">All volunteer registrations have been processed.</span>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {volunteers.map((v) => (
        <div key={v.id} className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full border border-[color:var(--border)] bg-slate-100 dark:bg-slate-800 flex shrink-0 items-center justify-center">
              {v.image ? (
                <img src={v.image} alt={v.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg">👤</span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-[color:var(--foreground)]">{v.name}</p>
              <p className="text-xs text-slate-500">{v.email}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Applied: {new Date(v.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <button
            onClick={() => handleApprove(v.id)}
            disabled={approvingId === v.id}
            className="focus-ring ml-4 shrink-0 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-400 disabled:opacity-50 transition"
          >
            {approvingId === v.id ? "Approving..." : "Approve"}
          </button>
        </div>
      ))}
    </div>
  );
}
