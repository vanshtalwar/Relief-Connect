"use client";

import { useEffect, useState } from "react";
import { getOfflineMessage } from "@/lib/offline-queue";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine);
    updateOnlineState();
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  const message = getOfflineMessage(isOnline, 0);
  const showText = message !== "Live sync active";

  return (
    <div
      className={`glass-panel inline-flex items-center justify-center rounded-full transition-all duration-300 ${
        showText ? "gap-2.5 px-4 py-2 text-sm" : "p-3"
      } text-[color:var(--foreground)]/85`}
      title={message}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${isOnline ? "bg-emerald-400/70" : "bg-amber-400/70"}`} />
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-amber-400"}`} />
      </span>
      {showText ? <span className="font-medium text-xs">{message}</span> : null}
    </div>
  );
}