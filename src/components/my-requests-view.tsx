"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { RequestCard } from "./request-card";
import type { RequestStatus } from "@/lib/constants";

type FormattedRequest = {
  id: string;
  title: string;
  category: "MEDICAL" | "FOOD" | "WATER" | "SHELTER" | "RESCUE" | "OTHER";
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: RequestStatus;
  description: string;
  latitude: number;
  longitude: number;
  locationName?: string | null;
  photoUrl?: string;
  requesterId: string;
  volunteerId?: string;
  isSOS?: boolean;
  createdAt: string;
  updatedAt: string;
  responders?: Array<{ id: string; name: string }>;
};

type TabFilter = "ALL" | "POSTED" | "CLAIMED";
type StatusFilter = "ALL" | RequestStatus;

export function MyRequestsView({
  requests,
  currentUserId,
  userRole,
  isVolunteer,
  isVictim,
}: {
  requests: FormattedRequest[];
  currentUserId: string;
  userRole?: string;
  isVolunteer: boolean;
  isVictim: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const postedRequests = useMemo(
    () => requests.filter((r) => r.requesterId === currentUserId),
    [requests, currentUserId]
  );

  const claimedRequests = useMemo(
    () => requests.filter((r) => r.requesterId !== currentUserId),
    [requests, currentUserId]
  );

  const openCount = useMemo(
    () => requests.filter((r) => r.status === "OPEN").length,
    [requests]
  );

  const resolvedCount = useMemo(
    () => requests.filter((r) => r.status === "RESOLVED").length,
    [requests]
  );

  const filteredRequests = useMemo(() => {
    let list = requests;

    if (activeTab === "POSTED") {
      list = postedRequests;
    } else if (activeTab === "CLAIMED") {
      list = claimedRequests;
    }

    if (statusFilter !== "ALL") {
      list = list.filter((r) => r.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.locationName && r.locationName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [requests, activeTab, postedRequests, claimedRequests, statusFilter, searchQuery]);

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 sm:space-y-6">
      {/* Volunteer Role Notice Banner */}
      {isVolunteer && (
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3.5 sm:p-5 text-sky-950 dark:text-sky-100 backdrop-blur-md shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 sm:gap-4 w-full min-w-0">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-lg sm:text-xl">
              📢
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold leading-snug">Need emergency relief or aid?</p>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-sky-200/80 mt-0.5 leading-relaxed">
                To post a new request, switch your role to Victim in your profile settings.
              </p>
            </div>
          </div>
          <Link
            href="/profile"
            className="focus-ring whitespace-nowrap w-full sm:w-auto justify-center rounded-full bg-sky-500 hover:bg-sky-400 px-4 py-2.5 sm:py-2 text-xs font-bold text-slate-950 transition shadow-sm hover:-translate-y-0.5 inline-flex items-center gap-2 active:scale-95 touch-manipulation shrink-0"
          >
            <span>Change Role in Profile</span>
            <span className="text-sm font-bold">→</span>
          </Link>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-2xl font-bold text-[color:var(--foreground)] tracking-tight">
            Your Relief Activity
          </h2>
          <p className="text-xs sm:text-sm text-[color:var(--foreground)]/60 mt-0.5">
            Track your requested aid and volunteer assignments in one place.
          </p>
        </div>
        {isVictim && (
          <Link
            href="/requests/new"
            className="focus-ring w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2.5 text-xs sm:text-sm uppercase tracking-wider transition shadow-md hover:-translate-y-0.5 active:scale-95 touch-manipulation shrink-0"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Post New Request</span>
          </Link>
        )}
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full min-w-0">
        <div className="rounded-xl sm:rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-2.5 sm:p-3.5 shadow-sm min-w-0">
          <p className="text-[10px] sm:text-[11px] font-semibold text-[color:var(--foreground)]/55 uppercase tracking-wider truncate">Total Items</p>
          <p className="text-lg sm:text-2xl font-black text-[color:var(--foreground)] mt-0.5">{requests.length}</p>
        </div>
        <div className="rounded-xl sm:rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-2.5 sm:p-3.5 shadow-sm min-w-0">
          <p className="text-[10px] sm:text-[11px] font-semibold text-sky-500 uppercase tracking-wider truncate">Posted by You</p>
          <p className="text-lg sm:text-2xl font-black text-sky-500 mt-0.5">{postedRequests.length}</p>
        </div>
        <div className="rounded-xl sm:rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-2.5 sm:p-3.5 shadow-sm min-w-0">
          <p className="text-[10px] sm:text-[11px] font-semibold text-emerald-500 uppercase tracking-wider truncate">Volunteering</p>
          <p className="text-lg sm:text-2xl font-black text-emerald-500 mt-0.5">{claimedRequests.length}</p>
        </div>
        <div className="rounded-xl sm:rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-2.5 sm:p-3.5 shadow-sm min-w-0">
          <p className="text-[10px] sm:text-[11px] font-semibold text-amber-500 uppercase tracking-wider truncate">Open / Pending</p>
          <p className="text-lg sm:text-2xl font-black text-amber-500 mt-0.5">{openCount}</p>
        </div>
      </div>

      {/* Tabs (Segmented Control - Full width grid to prevent horizontal overflow on mobile) */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[color:var(--muted)] border border-[color:var(--border)] w-full min-w-0 max-w-full">
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`w-full py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center touch-manipulation active:scale-95 truncate ${
            activeTab === "ALL"
              ? "bg-[color:var(--surface)] text-[color:var(--foreground)] shadow-sm border border-[color:var(--border)]"
              : "text-[color:var(--foreground)]/60 hover:text-[color:var(--foreground)]"
          }`}
        >
          All ({requests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("POSTED")}
          className={`w-full py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center touch-manipulation active:scale-95 truncate ${
            activeTab === "POSTED"
              ? "bg-[color:var(--surface)] text-sky-500 shadow-sm border border-[color:var(--border)]"
              : "text-[color:var(--foreground)]/60 hover:text-[color:var(--foreground)]"
          }`}
        >
          <span>📌 </span>
          <span className="inline sm:hidden">Mine ({postedRequests.length})</span>
          <span className="hidden sm:inline">Posted ({postedRequests.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("CLAIMED")}
          className={`w-full py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center touch-manipulation active:scale-95 truncate ${
            activeTab === "CLAIMED"
              ? "bg-[color:var(--surface)] text-emerald-500 shadow-sm border border-[color:var(--border)]"
              : "text-[color:var(--foreground)]/60 hover:text-[color:var(--foreground)]"
          }`}
        >
          <span>🤝 </span>
          <span className="inline sm:hidden">Claimed ({claimedRequests.length})</span>
          <span className="hidden sm:inline">Claimed Tasks ({claimedRequests.length})</span>
        </button>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full min-w-0 max-w-full">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-0 w-full">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[color:var(--foreground)]/40 pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, location or description..."
            className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder-[color:var(--foreground)]/40 outline-none focus:border-sky-400 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[color:var(--foreground)]/40 hover:text-[color:var(--foreground)] p-1.5"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Horizontal Scroll Pills without shrink-0 so it fits mobile width cleanly */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full sm:w-auto min-w-0 max-w-full touch-pan-x">
          {(
            [
              { key: "ALL", label: "All Statuses" },
              { key: "OPEN", label: "Open" },
              { key: "CLAIMED", label: "Claimed" },
              { key: "IN_PROGRESS", label: "In Progress" },
              { key: "RESOLVED", label: "Resolved" },
            ] as const
          ).map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setStatusFilter(s.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all touch-manipulation active:scale-95 ${
                statusFilter === s.key
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "bg-[color:var(--surface)] border border-[color:var(--border)] text-[color:var(--foreground)]/70 hover:bg-[color:var(--surface-strong)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Request Cards Grid */}
      {filteredRequests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full min-w-0 max-w-full">
          {filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              showActions={request.requesterId === currentUserId || userRole === "COORDINATOR"}
              userRoleContext={request.requesterId === currentUserId ? "requester" : "volunteer"}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="glass-panel flex flex-col items-center justify-center rounded-3xl p-8 sm:p-12 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--surface-strong)] text-slate-500 dark:text-slate-400 text-xl border border-[color:var(--border)] mb-3">
            {searchQuery ? "🔍" : activeTab === "CLAIMED" ? "🤝" : "📂"}
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {searchQuery
              ? `No requests match "${searchQuery}"`
              : activeTab === "CLAIMED"
              ? "No volunteer tasks claimed yet"
              : activeTab === "POSTED"
              ? "You haven't posted any help requests"
              : "No requests found"}
          </h3>
          <p className="mt-1.5 max-w-sm text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {searchQuery
              ? "Try clearing the search or choosing another status filter."
              : activeTab === "CLAIMED"
              ? "Browse the Live Dashboard map to discover nearby emergency requests and join response teams."
              : "Post an emergency request or view the map to see real-time relief operations in your area."}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="focus-ring px-4 py-2 rounded-full bg-[color:var(--surface-strong)] text-xs font-semibold border border-[color:var(--border)] hover:bg-[color:var(--border)] transition-colors"
              >
                Clear Search
              </button>
            ) : null}

            {isVictim ? (
              <Link
                href="/requests/new"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2 text-xs uppercase tracking-wider transition shadow-md active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Post a Request</span>
              </Link>
            ) : (
              <Link
                href="/profile"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2 text-xs uppercase tracking-wider transition shadow-md active:scale-95"
              >
                <span>Switch to Victim Role</span>
                <span>→</span>
              </Link>
            )}

            <Link
              href="/dashboard"
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] font-semibold px-4 py-2 text-xs uppercase tracking-wider transition hover:bg-[color:var(--surface-strong)]"
            >
              <span>Explore Live Map</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
