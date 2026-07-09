"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enqueueAction } from "@/lib/offline-queue";

export function ResolveRequestForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueAction({ type: "RESOLVE_REQUEST", payload: { requestId } });
        alert("You are offline. The request resolution has been safely queued and will sync when connection is restored.");
        router.refresh();
        return;
      }

      const res = await fetch(`/api/requests/${requestId}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to resolve request.");
      }
    } catch {
      setError("Failed to resolve request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 border-t border-[color:var(--border)] pt-5 space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-[color:var(--foreground)]">Mission Accomplished?</h4>
        <p className="mt-1 text-xs text-[color:var(--foreground)]/60">
          Mark this request as resolved once the help has been fully delivered and confirmed.
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-2xl">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="focus-ring w-full rounded-full bg-emerald-400 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-400/10 transition hover:-translate-y-0.5 hover:bg-emerald-300 disabled:opacity-50"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Processing..." : "Mark as Resolved"}
      </button>
    </form>
  );
}
