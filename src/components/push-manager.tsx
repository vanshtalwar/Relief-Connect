"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

function urlB64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; ++index) {
    outputArray[index] = rawData.charCodeAt(index);
  }
  return outputArray;
}

export function PushManager() {
  const { data: session } = useSession();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    async function registerPush() {
      try {
        const registration = await navigator.serviceWorker.ready;

        // Check if subscription already exists
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          // Request permission
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            console.log("Notification permission denied");
            return;
          }

          // Fetch the public VAPID key from subscribe endpoint
          const res = await fetch("/api/notifications/subscribe");
          const data = await res.json();
          if (!data.publicKey) {
            console.error("VAPID public key not found on server");
            return;
          }

          const convertedVapidKey = urlB64ToUint8Array(data.publicKey);

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
          });
        }

        // Send subscription to server
        await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        });
        console.log("Successfully registered Web Push Subscription");
      } catch (err) {
        console.error("Failed to subscribe to Web Push:", err);
      }
    }

    if (session?.user) {
      void registerPush();
    }
  }, [session]);

  return null;
}
