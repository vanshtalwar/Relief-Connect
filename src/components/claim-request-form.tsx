"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enqueueAction } from "@/lib/offline-queue";

export function ClaimRequestForm({ requestId, actionLabel = "Claim Request" }: { requestId: string; actionLabel?: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueAction({ type: "CLAIM_REQUEST", payload: { requestId, note: note.trim() || undefined } });
        setNote("");
        alert("You are offline. Your team assignment claim has been safely queued and will sync when connection is restored.");
        router.refresh();
        return;
      }

      const res = await fetch(`/api/requests/${requestId}/claim`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });

      if (res.ok) {
        setNote("");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to claim request.");
      }
    } catch {
      setError("Failed to claim request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 border-t border-[color:var(--border)] pt-5 space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-[color:var(--foreground)]">{actionLabel}</h4>
        <p className="mt-1 text-xs text-[color:var(--foreground)]/60">
          Volunteering to help with this request? Let the team know your plans or estimated arrival.
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-2xl">
          {error}
        </p>
      )}

      <div className="space-y-3">
        <textarea
          className="input w-full text-sm min-h-20 text-[color:var(--foreground)]"
          placeholder="Add an optional message or response details..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isSubmitting}
          maxLength={500}
        />
        <button
          type="submit"
          className="focus-ring w-full rounded-full bg-sky-400 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-sky-400/10 transition hover:-translate-y-0.5 hover:bg-sky-300 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Processing..." : actionLabel}
        </button>
      </div>
    </form>
  );
}
