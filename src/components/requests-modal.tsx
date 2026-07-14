"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export type Filter = { type: string; value: string } | null;

export function RequestsModal({ filter, onClose }: { filter: Filter; onClose: () => void }) {
  const router = useRouter();
  const [modalRequests, setModalRequests] = useState<any[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  useEffect(() => {
    if (!filter) return;
    setIsModalLoading(true);

    const query = filter.type === "all" ? "" : `?${filter.type}=${filter.value}`;

    fetch(`/api/requests${query}`)
      .then((res) => res.json())
      .then((data) => {
        setModalRequests(data.requests || []);
      })
      .catch((err) => console.error("Error fetching filtered requests:", err))
      .finally(() => setIsModalLoading(false));
  }, [filter]);

  if (!filter) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[80vh] flex flex-col bg-[color:var(--muted)] rounded-xl border border-[color:var(--border)] shadow-2xl overflow-hidden relative">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--border)] bg-[color:var(--surface)]">
          <h3 className="text-[14px] font-medium text-[color:var(--foreground)]">
            {filter.type === "category"
              ? `${filter.value} Requests`
              : filter.type === "date"
              ? `Requests on ${filter.value}`
              : filter.type === "status"
              ? `${filter.value} Requests`
              : "All Requests"}
          </h3>
          <button
            onClick={onClose}
            className="text-[color:var(--foreground)]/50 hover:text-[color:var(--foreground)] transition-colors p-1.5 rounded-md hover:bg-[color:var(--surface-strong)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto safe-scrollbar p-5 space-y-3">
          {isModalLoading ? (
            <div className="text-center py-12 text-[13px] text-[color:var(--foreground)]/50">
              Loading requests...
            </div>
          ) : modalRequests.length === 0 ? (
            <div className="text-center py-12 text-[13px] text-[color:var(--foreground)]/50">
              No requests found for this filter.
            </div>
          ) : (
            modalRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]/50 hover:bg-[color:var(--surface-strong)] transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#38bdf8]">
                    {req.category}
                  </span>
                  <span className="text-[11px] text-[color:var(--foreground)]/50">
                    {new Date(req.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <h4 className="text-[14px] font-medium text-[color:var(--foreground)]">
                  {req.title}
                </h4>
                <p className="text-[13px] text-[color:var(--foreground)]/70 line-clamp-2 mt-1.5 leading-relaxed">
                  {req.description}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span
                    className={`text-[10px] px-2 py-0.5 uppercase tracking-wider font-bold rounded ${
                      req.status === "OPEN"
                        ? "text-[#D0A24C] bg-[#D0A24C]/10"
                        : req.status === "RESOLVED"
                        ? "text-[#3FA37E] bg-[#3FA37E]/10"
                        : "text-[#38bdf8] bg-[#38bdf8]/10"
                    }`}
                  >
                    {req.status}
                  </span>
                  <button
                    onClick={() => router.push(`/requests/${req.id}`)}
                    className="text-[12px] font-medium text-[color:var(--foreground)] hover:text-[#38bdf8] transition-colors"
                  >
                    View details →
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
