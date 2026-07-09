"use client";

import { useEffect, useState } from "react";

type NotificationItem = {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export function NotificationDrawer() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 5;

  useEffect(() => {
    async function loadNotifications() {
      setLoading(true);
      try {
        const res = await fetch(`/api/notifications?page=${page}&limit=${limit}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        console.error("Error loading notifications:", err);
      } finally {
        setLoading(false);
      }
    }
    void loadNotifications();
  }, [page]);

  const getDetailedMessage = (message: string) => {
    if (message.includes("claimed")) {
      return "A verified local responder claimed the request. They are currently gathering resources and heading to the marked coordinates.";
    }
    if (message.includes("critical")) {
      return "Two urgent alerts have been flagged within a 1km radius of your current location. Please review the Map Dashboard to coordinate support.";
    }
    if (message.includes("refreshed")) {
      return "The operations engine has successfully compiled recent incident reports, resolution rates, and active responder counts. The dashboard is now up to date.";
    }
    return "Detailed event log: This alert was dispatched automatically by the live operations sync engine. Responders have been notified and logs have been updated.";
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-3xl p-5 text-center text-slate-500">
        Loading notifications...
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-3xl p-5">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Notifications</h2>
      <div className="mt-4 space-y-3">
        {notifications.length > 0 ? (
          notifications.map((notification) => {
            const isExpanded = expandedId === notification.id;
            return (
              <div
                key={notification.id}
                onClick={() => setExpandedId(isExpanded ? null : notification.id)}
                className="group cursor-pointer rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm transition hover:border-sky-400/40 hover:bg-[color:var(--surface-strong)]"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {notification.message}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>
                {isExpanded && (
                  <div className="mt-3 border-t border-[color:var(--border)] pt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400 animate-slide-down">
                    {getDetailedMessage(notification.message)}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center text-xs text-slate-500 py-4">No notifications logged.</div>
        )}
      </div>
      
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-[color:var(--border)] pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="focus-ring rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs font-medium text-[color:var(--foreground)] disabled:opacity-40 hover:bg-[color:var(--surface-strong)] transition"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="focus-ring rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs font-medium text-[color:var(--foreground)] disabled:opacity-40 hover:bg-[color:var(--surface-strong)] transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}