"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "./i18n-provider";

export function SOSButton() {
  const { data: session } = useSession();
  const [isSending, setIsSending] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleSOS = () => {
    if (isSending) return;
    
    // Check if geolocation is available
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      setIsSending(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            const payload = {
              title: "🚨 SOS EMERGENCY RESPONSE",
              description: "This is an automated SOS distress signal. The user requires immediate, critical assistance at their current location.",
              category: "RESCUE",
              urgency: "CRITICAL",
              latitude,
              longitude,
              locationName: "Emergency Location Coordinates",
              contactName: session?.user?.name || "SOS Victim",
              contactPhone: "000-0000", // Default/Placeholder satisfying min(7)
              isSOS: true,
              clientUuid: crypto.randomUUID(),
            };

            const response = await fetch("/api/requests", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (response.ok) {
              const data = await response.json();
              router.push(`/requests/${data.request.id}`);
            } else {
              console.error(t.sos.error);
            }
          } catch (error) {
            console.error("SOS error", error);
          } finally {
            setIsSending(false);
          }
        },
        (error) => {
          console.error("Could not get location for SOS", error);
          alert("Could not get your location. Please ensure location services are enabled to send an SOS.");
          setIsSending(false);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  if (session?.user?.role === "COORDINATOR") {
    return null; // Coordinators don't need personal SOS buttons
  }

  return (
    <button
      onClick={handleSOS}
      disabled={isSending}
      className="focus-ring flex items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/30 transition hover:-translate-y-0.5 hover:bg-red-500 disabled:opacity-50 animate-pulse hover:animate-none"
      title="Send an immediate SOS distress signal"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
      {isSending ? t.sos.sending : t.sos.buttonText}
    </button>
  );
}
