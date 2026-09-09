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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [isBatchAssigning, setIsBatchAssigning] = useState(false);

  // Manual volunteer directory search
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [directoryVolunteers, setDirectoryVolunteers] = useState<any[]>([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [selectedDirectoryIds, setSelectedDirectoryIds] = useState<Set<string>>(new Set());

  const router = useRouter();

  useEffect(() => {
    fetch(`/api/volunteers/suggest?requestId=${requestId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load suggestions");
        return res.json();
      })
      .then((data) => {
        setSuggestions(data.suggestions || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [requestId]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === suggestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(suggestions.map((s) => s.volunteer.id)));
    }
  };

  const handleAssignSingle = async (volunteerId: string) => {
    setAssigningId(volunteerId);
    try {
      const res = await fetch(`/api/requests/${requestId}/claim`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "Dispatched by Coordinator", volunteerId }),
      });
      if (res.ok) {
        setSuggestions((prev) => prev.filter((s) => s.volunteer.id !== volunteerId));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(volunteerId);
          return next;
        });
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to dispatch volunteer");
      }
    } catch {
      alert("Failed to dispatch volunteer");
    } finally {
      setAssigningId(null);
    }
  };

  const handleBatchAssign = async (volunteerIds: string[]) => {
    if (volunteerIds.length === 0) return;
    setIsBatchAssigning(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/claim`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: `Batch dispatched ${volunteerIds.length} volunteer(s) by Coordinator`,
          volunteerIds,
        }),
      });
      if (res.ok) {
        setSuggestions((prev) => prev.filter((s) => !volunteerIds.includes(s.volunteer.id)));
        setSelectedIds(new Set());
        setSelectedDirectoryIds(new Set());
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to dispatch volunteers");
      }
    } catch {
      alert("Failed to dispatch volunteers");
    } finally {
      setIsBatchAssigning(false);
    }
  };

  const searchDirectory = async (query: string) => {
    setSearchQuery(query);
    setIsLoadingDirectory(true);
    try {
      const res = await fetch(`/api/volunteers?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setDirectoryVolunteers(data.volunteers || []);
      }
    } catch (err) {
      console.error("Directory search failed:", err);
    } finally {
      setIsLoadingDirectory(false);
    }
  };

  const toggleSelectDirectory = (id: string) => {
    setSelectedDirectoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="p-5 text-sm text-[color:var(--foreground)]/60 animate-pulse">
        Running smart responder matching algorithm...
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6 border-t border-[color:var(--border)] pt-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[color:var(--foreground)] flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-indigo-400"
            >
              <path d="m12 14 4-4" />
              <path d="M3.34 19a10 10 0 1 1 17.32 0" />
            </svg>
            Smart Routing & Team Dispatch
          </h3>
          <p className="text-xs text-[color:var(--foreground)]/60 mt-0.5">
            Ranked by proximity, skill match, and verification trust level.
          </p>
        </div>

        {suggestions.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="focus-ring text-xs font-semibold px-2.5 py-1 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] hover:bg-[color:var(--surface-strong)] transition"
            >
              {selectedIds.size === suggestions.length ? "Deselect All" : "Select All"}
            </button>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => handleBatchAssign(Array.from(selectedIds))}
                disabled={isBatchAssigning}
                className="focus-ring text-xs font-bold px-3 py-1 rounded-md bg-indigo-500 hover:bg-indigo-400 text-white transition shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <span>Dispatch Selected ({selectedIds.size})</span>
                {isBatchAssigning && <span className="animate-spin text-xs">⏳</span>}
              </button>
            )}
          </div>
        )}
      </div>

      {error && <div className="p-3 text-sm text-red-400 bg-red-400/10 rounded-xl border border-red-400/20">{error}</div>}

      {suggestions.length > 0 ? (
        <div className="space-y-3 mt-4">
          {suggestions.map(({ volunteer, distanceKm, skillMatchScore }) => {
            const isSelected = selectedIds.has(volunteer.id);
            return (
              <div
                key={volunteer.id}
                className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition ${
                  isSelected
                    ? "border-indigo-400 bg-indigo-500/10"
                    : "border-[color:var(--border)] bg-slate-900/20 hover:border-indigo-400/30"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(volunteer.id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/profile/${volunteer.id}`}
                        className="font-semibold text-sky-400 hover:underline truncate"
                      >
                        {volunteer.name}
                      </Link>
                      {volunteer.isVerified && (
                        <span
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-[10px]"
                          title="Identity Verified"
                        >
                          ✓
                        </span>
                      )}
                      {volunteer.backgroundCheck && (
                        <span
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px]"
                          title="Background Check Passed"
                        >
                          🛡️
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[color:var(--foreground)]/60 mt-1 font-medium">
                      {distanceKm.toFixed(1)} km away <span className="mx-1">•</span>{" "}
                      {Math.round(skillMatchScore * 100)}% Skill Match
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(volunteer.skills || []).slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="text-[10px] uppercase tracking-wider bg-[color:var(--surface-strong)] px-1.5 py-0.5 rounded text-[color:var(--foreground)]/70"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleAssignSingle(volunteer.id)}
                    disabled={assigningId === volunteer.id || isBatchAssigning}
                    className="focus-ring whitespace-nowrap rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-indigo-400 transition disabled:opacity-50"
                  >
                    {assigningId === volunteer.id ? "Assigning..." : "Dispatch"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface)]/30 text-center">
          <p className="text-xs text-[color:var(--foreground)]/60">
            No smart suggestions based on location. Use manual volunteer search below.
          </p>
        </div>
      )}

      {/* Manual Search & Dispatch from Global Volunteer Roster */}
      <div className="mt-4 pt-3 border-t border-[color:var(--border)]/70">
        <button
          type="button"
          onClick={() => {
            if (!showManualSearch && directoryVolunteers.length === 0) {
              searchDirectory("");
            }
            setShowManualSearch((prev) => !prev);
          }}
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1.5"
        >
          <span>{showManualSearch ? "▲ Hide Volunteer Roster" : "▼ Search & Dispatch Other Registered Volunteers"}</span>
        </button>

        {showManualSearch && (
          <div className="mt-3 space-y-3 bg-[color:var(--surface)] p-4 rounded-2xl border border-[color:var(--border)]">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => searchDirectory(e.target.value)}
                className="input w-full text-xs"
              />
              {selectedDirectoryIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => handleBatchAssign(Array.from(selectedDirectoryIds))}
                  disabled={isBatchAssigning}
                  className="whitespace-nowrap px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Dispatch ({selectedDirectoryIds.size})
                </button>
              )}
            </div>

            {isLoadingDirectory ? (
              <p className="text-xs text-slate-500 animate-pulse">Searching volunteers...</p>
            ) : directoryVolunteers.length > 0 ? (
              <div className="max-h-48 overflow-y-auto safe-scrollbar space-y-2">
                {directoryVolunteers.map((vol) => (
                  <div
                    key={vol.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)] text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedDirectoryIds.has(vol.id)}
                        onChange={() => toggleSelectDirectory(vol.id)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="truncate">
                        <p className="font-semibold text-[color:var(--foreground)] truncate">{vol.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{vol.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAssignSingle(vol.id)}
                      disabled={assigningId === vol.id || isBatchAssigning}
                      className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold rounded text-[11px] transition"
                    >
                      {assigningId === vol.id ? "..." : "Dispatch"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No volunteers found matching your query.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
