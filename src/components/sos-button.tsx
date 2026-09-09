"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "./i18n-provider";

export function SOSButton({
  variant = "default",
  className = "",
}: {
  variant?: "default" | "floating";
  className?: string;
}) {
  const { data: session } = useSession();
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);
  const router = useRouter();
  const { t } = useTranslation();

  const sendSOSRequest = async (latitude: number, longitude: number, isApproximate = false) => {
    try {
      const contactName = (session?.user?.name && session.user.name.trim().length >= 2)
        ? session.user.name.trim()
        : "SOS Victim";
      const contactPhone = (session?.user?.phone && session.user.phone.trim().length >= 7)
        ? session.user.phone.trim()
        : "000-0000";

      // Browser-safe UUID generation
      const clientUuid = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

      const payload = {
        title: "🚨 SOS EMERGENCY RESPONSE",
        description: isApproximate
          ? "This is an automated SOS distress signal. GPS was unavailable; approximate coordinates reported. User requires immediate assistance."
          : "This is an automated SOS distress signal. The user requires immediate, critical assistance at their current location.",
        category: "RESCUE",
        urgency: "CRITICAL",
        latitude,
        longitude,
        locationName: isApproximate ? "Emergency Location (Approximate / GPS Offline)" : "Emergency Location Coordinates",
        contactName,
        contactPhone,
        contactEmail: session?.user?.email || "",
        isSOS: true,
        clientUuid,
      };

      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        // Succeeded: keep locked while navigating away
        if (data?.request?.id) {
          window.location.href = `/requests/${data.request.id}`;
        } else {
          window.location.href = "/dashboard";
        }
      } else {
        const errData = await response.json().catch(() => null);
        const errMsg = typeof errData?.error === "string" 
          ? errData.error 
          : errData?.error?.message || t?.sos?.error || "SOS distress signal failed to send.";
        console.error("SOS dispatch failed:", errMsg);
        alert(errMsg);
        isSendingRef.current = false;
        setIsSending(false);
      }
    } catch (error: any) {
      console.error("SOS error", error);
      alert(error?.message || "An unexpected error occurred while sending SOS.");
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  const handleSOS = () => {
    if (isSendingRef.current || isSending) return;
    isSendingRef.current = true;
    setIsSending(true);

    // Default fallback coordinates (approximate capital center)
    const fallbackLat = 28.6139;
    const fallbackLng = 77.2090;

    let dispatched = false;
    // Hard 2-second timeout: never let browser location prompts or slow GPS freeze emergency dispatch
    const fallbackTimer = setTimeout(() => {
      if (!dispatched) {
        dispatched = true;
        sendSOSRequest(fallbackLat, fallbackLng, true);
      }
    }, 2000);

    if (typeof window !== "undefined" && "geolocation" in navigator) {
      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (!dispatched) {
              dispatched = true;
              clearTimeout(fallbackTimer);
              const { latitude, longitude } = position.coords;
              sendSOSRequest(latitude, longitude, false);
            }
          },
          (error) => {
            if (!dispatched) {
              dispatched = true;
              clearTimeout(fallbackTimer);
              console.warn("GPS unavailable or timed out, using fallback coordinates:", error.message);
              sendSOSRequest(fallbackLat, fallbackLng, true);
            }
          },
          {
            enableHighAccuracy: false,
            timeout: 1800,
            maximumAge: 300000,
          }
        );
      } catch (err) {
        if (!dispatched) {
          dispatched = true;
          clearTimeout(fallbackTimer);
          sendSOSRequest(fallbackLat, fallbackLng, true);
        }
      }
    } else {
      if (!dispatched) {
        dispatched = true;
        clearTimeout(fallbackTimer);
        sendSOSRequest(fallbackLat, fallbackLng, true);
      }
    }
  };

  if (variant === "floating") {
    return (
      <button
        onClick={handleSOS}
        disabled={isSending}
        className={`focus-ring fixed bottom-24 right-5 md:bottom-8 md:right-8 z-40 flex items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-3 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-[0_10px_30px_-5px_rgba(239,68,68,0.7)] transition-all hover:scale-105 active:scale-95 ring-4 ring-red-500/25 hover:bg-red-500 disabled:opacity-60 animate-pulse hover:animate-none ${className}`}
        title="Emergency SOS: Broadcast immediate rescue distress signal"
        aria-label="Send emergency SOS signal"
      >
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        <span>{isSending ? (t?.sos?.sending || "SENDING...") : "SOS PANIC"}</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleSOS}
      disabled={isSending}
      className={`focus-ring flex items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/30 transition hover:-translate-y-0.5 hover:bg-red-500 disabled:opacity-50 animate-pulse hover:animate-none ${className}`}
      title="Send an immediate SOS distress signal"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
      {isSending ? (t?.sos?.sending || "SENDING...") : (t?.sos?.buttonText || "SOS PANIC")}
    </button>
  );
}
