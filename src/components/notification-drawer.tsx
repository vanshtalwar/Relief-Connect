"use client";

import { useEffect, useState } from "react";

type NotificationItem = {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
};

function ParsedNotificationMessage({ message }: { message: string }) {
  // Regex for Claimed Request
  const claimRegex = /Volunteer "(.*?)" claimed request "(.*?)". Category: (.*?), Urgency: (.*?), Requester: (.*?). Message: (.*)/;
  const claimMatch = message.match(claimRegex);
  
  if (claimMatch) {
    const [_, volunteer, requestTitle, category, urgency, requester, reqMessage] = claimMatch;
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[13px] text-[color:var(--foreground)] font-medium leading-snug">
          <span className="text-[#3FA37E] font-semibold">{volunteer}</span> claimed request <span className="font-semibold">"{requestTitle}"</span>
        </p>
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          <span className="px-1.5 py-0.5 bg-[color:var(--surface-strong)] text-[10px] uppercase tracking-wider font-bold text-[color:var(--foreground)]/70 rounded">
            {category}
          </span>
          <span className={`px-1.5 py-0.5 bg-[color:var(--surface-strong)] text-[10px] uppercase tracking-wider font-bold rounded ${urgency === 'CRITICAL' ? 'text-[#E05C5C]' : 'text-[#D0A24C]'}`}>
            {urgency}
          </span>
        </div>
        <div className="mt-1 flex flex-col gap-1 text-[12px] text-[color:var(--foreground)]/70 bg-[color:var(--surface)] p-2.5 rounded-md border border-[color:var(--border)]">
           <p><strong className="text-[color:var(--foreground)]/50 uppercase tracking-wider text-[9px] mr-1">Requester:</strong> {requester}</p>
           {reqMessage && reqMessage !== "No message left" && (
             <p><strong className="text-[color:var(--foreground)]/50 uppercase tracking-wider text-[9px] mr-1">Message:</strong> {reqMessage}</p>
           )}
        </div>
      </div>
    );
  }

  // Regex for New/Pending request
  const pendingRegex = /Request "(.*?)" is now pending volunteer review./;
  const pendingMatch = message.match(pendingRegex);
  if (pendingMatch) {
    const [_, requestTitle] = pendingMatch;
    return (
      <p className="text-[13px] text-[color:var(--foreground)] leading-snug">
         New request <span className="font-semibold">"{requestTitle}"</span> is pending review.
      </p>
    );
  }

  // Fallback
  return <p className="text-[13px] text-[color:var(--foreground)] leading-snug">{message}</p>;
}

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

  if (loading && notifications.length === 0) {
    return (
      <div className="flex h-full min-h-[400px] flex-col bg-[color:var(--muted)] border border-[color:var(--border)] rounded-xl overflow-hidden shadow-sm">
        <div className="border-b border-[color:var(--border)] px-4 py-3 bg-[color:var(--surface)]">
          <div className="h-4 w-20 bg-[color:var(--surface-strong)] rounded animate-pulse"></div>
        </div>
        <div className="flex-1 p-4 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="flex-1 space-y-3">
                <div className="h-3 w-5/6 bg-[color:var(--surface-strong)] rounded"></div>
                <div className="h-3 w-4/6 bg-[color:var(--surface-strong)] rounded"></div>
                <div className="flex gap-2 mt-2">
                  <div className="h-4 w-12 bg-[color:var(--surface-strong)] rounded"></div>
                  <div className="h-4 w-12 bg-[color:var(--surface-strong)] rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[color:var(--muted)] border border-[color:var(--border)] rounded-xl overflow-hidden h-full max-h-[600px] shadow-sm">
      <div className="border-b border-[color:var(--border)] px-4 py-3 bg-[color:var(--surface)] flex items-center justify-between">
        <h2 className="text-[13px] font-medium text-[color:var(--foreground)] tracking-wide">Activity Log</h2>
        <div className="flex items-center gap-2.5">
          {loading && <span className="text-[9px] text-[color:var(--foreground)]/50 uppercase tracking-widest font-medium">Syncing</span>}
          <div className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3FA37E] opacity-30 duration-1000"></span>
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3FA37E]"></span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto safe-scrollbar">
        {notifications.length > 0 ? (
          <div className="flex flex-col divide-y divide-[color:var(--border)]">
            {notifications.map((notification) => {
              const isExpanded = expandedId === notification.id;
              return (
                <div
                  key={notification.id}
                  onClick={() => setExpandedId(isExpanded ? null : notification.id)}
                  className="group cursor-pointer bg-transparent px-4 py-4 transition-colors duration-200 hover:bg-[color:var(--surface)]"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <ParsedNotificationMessage message={notification.message} />
                    </div>
                    <span className="mt-0.5 text-[9px] text-[color:var(--foreground)]/50 group-hover:text-[color:var(--foreground)]/70 transition-colors shrink-0">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 pl-3 border-l-2 border-[color:var(--surface-strong)] text-[12px] leading-relaxed text-[color:var(--foreground)]/70 animate-slide-down">
                      {getDetailedMessage(notification.message)}
                      <p className="mt-2 text-[10px] text-[color:var(--foreground)]/50 font-medium tracking-wide">
                        {new Date(notification.createdAt).toLocaleString(undefined, {
                           month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="w-10 h-10 text-[color:var(--foreground)]/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-[13px] text-[color:var(--foreground)]/70 font-medium">All caught up</p>
            <p className="text-[12px] text-[color:var(--foreground)]/50 mt-1">No new activity to report.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="rounded-md px-3 py-1.5 text-[11px] font-medium tracking-wide text-[color:var(--foreground)] transition-colors duration-200 hover:bg-[color:var(--surface-strong)] disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Previous
          </button>
          <span className="text-[11px] font-medium tracking-wide text-[color:var(--foreground)]/50">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="rounded-md px-3 py-1.5 text-[11px] font-medium tracking-wide text-[color:var(--foreground)] transition-colors duration-200 hover:bg-[color:var(--surface-strong)] disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}