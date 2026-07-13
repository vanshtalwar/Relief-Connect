"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this request? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete request");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 border-t border-[rgba(255,255,255,0.06)] pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <div>
          <h4 className="text-[13px] font-semibold text-red-400">Danger Zone</h4>
          <p className="text-[12px] text-[#A0A0A0] mt-1">If this request is a duplicate or violates guidelines, you can permanently remove it.</p>
          {error && <p className="text-[11px] text-red-400 mt-2">{error}</p>}
        </div>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="focus-ring whitespace-nowrap rounded-md bg-red-500/10 px-4 py-2 text-[12px] font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
        >
          {loading ? "Deleting..." : "Delete Request"}
        </button>
      </div>
    </div>
  );
}
