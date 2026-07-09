"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { categoryLabels, requestStatusLabels, urgencyMeta, type RequestStatus, categories, urgencies } from "@/lib/constants";
import { formatDistance } from "@/lib/geo";

export function RequestCard({
  request,
  showActions = false,
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
  };
  showActions?: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
        const data = await res.json();
        setError(data.error?.message ?? "Failed to save request.");
      }
    } catch {
      setError("Failed to save request.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      } else {
        setError("Failed to delete request.");
      }
    } catch {
      setError("Failed to delete request.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSave} className="glass-panel block rounded-3xl p-5 space-y-3">
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
          <div className="grid grid-cols-2 gap-2">
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
        <div className="flex justify-end gap-2 pt-2 text-xs">
          <button
            type="button"
            className="focus-ring rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 font-medium text-[color:var(--foreground)]/80"
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="focus-ring rounded-full bg-sky-400 px-4 py-1.5 font-semibold text-slate-950"
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
      <div className="glass-panel block rounded-3xl p-5 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-[color:var(--foreground)]">Confirm Delete</h4>
          <p className="mt-1 text-xs text-slate-505 dark:text-slate-400">
            Are you sure you want to delete "{request.title}"? This cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-2 text-xs">
          <button
            type="button"
            className="focus-ring rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 font-medium text-[color:var(--foreground)]/80"
            onClick={() => setIsDeleting(false)}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="focus-ring rounded-full bg-red-500 px-4 py-1.5 font-semibold text-white"
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
    <div className={`focus-ring glass-panel block rounded-3xl p-5 transition duration-300 hover:shadow-2xl ${request.isSOS ? 'border-2 border-red-500 shadow-red-500/20' : ''}`}>
      {request.isSOS && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-md animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          SOS EMERGENCY
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--foreground)]/55">{categoryLabels[request.category]}</p>
          <Link href={`/requests/${request.id}`} className="mt-1 block text-lg font-semibold text-[color:var(--foreground)] hover:text-sky-400 transition-colors">
            {request.title}
          </Link>
        </div>
        <div className="rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm shrink-0" style={{ backgroundColor: activeUrgency.color }}>
          {activeUrgency.label}
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[color:var(--foreground)]/72">{request.description}</p>
      <div className="mt-4 flex items-center justify-between text-sm text-[color:var(--foreground)]/70">
        <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-xs font-medium">{requestStatusLabels[request.status]}</span>
        <span className="font-medium">{formatDistance(request.distanceKm)}</span>
      </div>

      {showActions && (
        <div className="mt-4 flex justify-end gap-2 border-t border-[color:var(--border)] pt-3 text-xs">
          <button
            type="button"
            className="focus-ring rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 font-medium text-[color:var(--foreground)]/80 hover:border-sky-400/40 hover:bg-[color:var(--surface-strong)]"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </button>
          <button
            type="button"
            className="focus-ring rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 font-medium text-red-400 hover:border-red-500/40 hover:bg-red-500/20"
            onClick={() => setIsDeleting(true)}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}