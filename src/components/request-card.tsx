"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { categoryLabels, requestStatusLabels, urgencyMeta, type RequestStatus, categories, urgencies } from "@/lib/constants";
import { formatDistance } from "@/lib/geo";

export function RequestCard({
  request,
  showActions = false,
  userRoleContext = null,
}: {
  request: {
    id: string;
    title: string;
    category: keyof typeof categoryLabels;
    urgency: keyof typeof urgencyMeta;
    status: RequestStatus;
    description: string;
    distanceKm?: number;
    requesterId?: string;
    updatedAt: string;
    isSOS?: boolean;
    responders?: Array<{ id: string; name: string }>;
    locationName?: string | null;
  };
  showActions?: boolean;
  userRoleContext?: "requester" | "volunteer" | null;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const [title, setTitle] = useState(request.title);
  const [description, setDescription] = useState(request.description);
  const [category, setCategory] = useState(request.category);
  const [urgency, setUrgency] = useState(request.urgency);
  const [error, setError] = useState<string | null>(null);

  const activeUrgency = urgencyMeta[request.urgency];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 4) {
      setError("Title must be at least 4 characters.");
      return;
    }
    if (description.trim().length < 20) {
      setError("Description must be at least 20 characters.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, urgency }),
      });
      if (res.ok) {
        setIsEditing(false);
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? data?.error ?? "Failed to save request.");
      }
    } catch {
      setError("Failed to save request.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleted(true);
        setIsDeleting(false);
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to delete request.");
      }
    } catch {
      setError("Failed to delete request.");
    } finally {
      setIsSaving(false);
    }
  };

  if (deleted) {
    return null;
  }

  if (isEditing) {
    return (
      <form onSubmit={handleSave} className="glass-panel block rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-3 w-full min-w-0 max-w-full overflow-hidden">
        <h4 className="text-sm font-semibold text-[color:var(--foreground)]">Edit Request</h4>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="space-y-2">
          <input
            type="text"
            className="input w-full text-sm"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSaving}
          />
          <textarea
            className="input w-full text-sm min-h-20"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSaving}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              className="input text-sm text-[color:var(--foreground)]"
              value={category}
              onChange={(e) => setCategory(e.target.value as never)}
              disabled={isSaving}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabels[cat]}
                </option>
              ))}
            </select>
            <select
              className="input text-sm text-[color:var(--foreground)]"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as never)}
              disabled={isSaving}
            >
              {urgencies.map((urg) => (
                <option key={urg} value={urg}>
                  {urgencyMeta[urg].label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 text-xs">
          <button
            type="button"
            className="focus-ring min-h-[38px] flex-1 sm:flex-initial justify-center rounded-xl sm:rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 font-medium text-[color:var(--foreground)]/80 active:scale-95"
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="focus-ring min-h-[38px] flex-1 sm:flex-initial justify-center rounded-xl sm:rounded-full bg-sky-400 px-5 py-2 font-semibold text-slate-950 active:scale-95"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    );
  }

  if (isDeleting) {
    return (
      <div className="glass-panel block rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4 w-full min-w-0 max-w-full overflow-hidden">
        <div>
          <h4 className="text-sm font-semibold text-[color:var(--foreground)]">Confirm Delete</h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Are you sure you want to delete &quot;{request.title}&quot;? This cannot be undone.
          </p>
          {error && <p className="mt-2 text-xs font-medium text-red-400">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            className="focus-ring min-h-[38px] flex-1 sm:flex-initial justify-center rounded-xl sm:rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 font-medium text-[color:var(--foreground)]/80 active:scale-95"
            onClick={() => {
              setIsDeleting(false);
              setError(null);
            }}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="focus-ring min-h-[38px] flex-1 sm:flex-initial justify-center rounded-xl sm:rounded-full bg-red-500 px-5 py-2 font-semibold text-white hover:bg-red-600 transition-colors active:scale-95"
            onClick={handleDelete}
            disabled={isSaving}
          >
            {isSaving ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => router.push(`/requests/${request.id}`, { scroll: true })}
      className={`cursor-pointer focus-ring glass-panel block rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 transition duration-300 hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.99] touch-manipulation relative group w-full min-w-0 max-w-full overflow-hidden break-words ${request.isSOS ? 'border-2 border-red-500 shadow-red-500/20' : ''}`}
    >
      {/* SOS Banner */}
      {request.isSOS && (
        <div className="mb-2.5 flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-md animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
          SOS EMERGENCY
        </div>
      )}

      {/* Role & Category Header */}
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span className="text-[10px] sm:text-xs uppercase tracking-wider font-bold text-[color:var(--foreground)]/60 bg-[color:var(--surface-strong)] px-2 py-0.5 rounded border border-[color:var(--border)] shrink-0">
            {categoryLabels[request.category]}
          </span>
          {userRoleContext === "requester" && (
            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold inline-flex items-center gap-1 shrink-0">
              <span>📌</span>
              <span>Your Request</span>
            </span>
          )}
          {userRoleContext === "volunteer" && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold inline-flex items-center gap-1 shrink-0">
              <span>🤝</span>
              <span>Joined Team</span>
            </span>
          )}
        </div>
        <div className="rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-bold text-white shadow-sm shrink-0" style={{ backgroundColor: activeUrgency.color }}>
          {activeUrgency.label}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm sm:text-base md:text-lg font-bold text-[color:var(--foreground)] group-hover:text-sky-400 transition-colors line-clamp-2 leading-snug break-words">
        {request.title}
      </h3>

      {/* Description - ALWAYS VISIBLE on mobile with line clamp */}
      <p className="mt-1.5 line-clamp-3 sm:line-clamp-2 text-xs sm:text-sm leading-relaxed text-[color:var(--foreground)]/70 break-words">
        {request.description}
      </p>

      {/* Location Address if available */}
      {request.locationName && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] sm:text-xs text-[color:var(--foreground)]/65 bg-[color:var(--surface-strong)]/60 px-2.5 py-1 rounded-lg border border-[color:var(--border)]/60 min-w-0">
          <span className="text-sky-500 shrink-0 text-xs">📍</span>
          <span className="truncate min-w-0 flex-1">{request.locationName}</span>
        </div>
      )}

      {/* Footer status & distance info */}
      <div className="mt-3 sm:mt-4 pt-2.5 border-t border-[color:var(--border)]/60 flex items-center justify-between gap-2 text-xs text-[color:var(--foreground)]/70 flex-wrap sm:flex-nowrap min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold shrink-0">
            {requestStatusLabels[request.status]}
          </span>
          {request.responders && request.responders.length > 0 && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] sm:text-xs font-bold inline-flex items-center gap-1 shrink-0">
              <span>👥</span>
              <span>{request.responders.length}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
          <span className="font-bold text-xs">{formatDistance(request.distanceKm)}</span>
          <span className="text-sky-500 group-hover:translate-x-0.5 transition-transform text-xs font-bold">
            Details →
          </span>
        </div>
      </div>

      {showActions && (
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-[color:var(--border)] pt-2.5 text-xs">
          <button
            type="button"
            className="focus-ring min-h-[38px] flex-1 sm:flex-initial justify-center rounded-xl sm:rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 font-bold text-[color:var(--foreground)]/90 hover:border-sky-400/40 hover:bg-[color:var(--surface-strong)] transition-all active:scale-95 flex items-center gap-1.5"
            onClick={(e) => { e.stopPropagation(); setError(null); setIsEditing(true); }}
          >
            <span>✏️</span>
            <span>Edit</span>
          </button>
          <button
            type="button"
            className="focus-ring min-h-[38px] flex-1 sm:flex-initial justify-center rounded-xl sm:rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 font-bold text-red-500 hover:border-red-500/40 hover:bg-red-500/20 transition-all active:scale-95 flex items-center gap-1.5"
            onClick={(e) => { e.stopPropagation(); setError(null); setIsDeleting(true); }}
          >
            <span>🗑️</span>
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}