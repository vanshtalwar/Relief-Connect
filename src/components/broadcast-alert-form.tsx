"use client";

import { useState } from "react";
import { useTranslation } from "./i18n-provider";

export function BroadcastAlertForm() {
  const [message, setMessage] = useState("");
  const [radiusKm, setRadiusKm] = useState(10);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const { t } = useTranslation();

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setIsSending(true);
    setStatus("idle");

    try {
      // Use standard default coordinates if location isn't vital for this demo, 
      // or try to grab the coordinator's location. We'll default to a central location.
      let latitude = 18.963;
      let longitude = 72.8258;

      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          latitude,
          longitude,
          radiusKm: Number(radiusKm)
        })
      });

      if (!res.ok) throw new Error("Broadcast failed");

      setStatus("success");
      setMessage("");
    } catch (err) {
      console.error(err);
      setStatus("error");
    } finally {
      setIsSending(false);
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <form onSubmit={handleBroadcast} className="mt-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Alert Message</label>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Evacuate Zone 4 immediately due to rising water levels."
          className="input min-h-[80px]"
        />
      </div>
      
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Broadcast Radius (km)</label>
        <input
          type="number"
          min="1"
          max="500"
          value={radiusKm}
          onChange={(e) => setRadiusKm(Number(e.target.value))}
          className="input"
        />
      </div>

      <button
        type="submit"
        disabled={isSending || !message.trim()}
        className="focus-ring mt-2 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
      >
        {isSending ? t.sos.sending : "BROADCAST ALERT"}
      </button>

      {status === "success" && (
        <p className="text-sm font-medium text-emerald-500">Alert broadcasted successfully!</p>
      )}
      {status === "error" && (
        <p className="text-sm font-medium text-red-500">Failed to send broadcast.</p>
      )}
    </form>
  );
}
