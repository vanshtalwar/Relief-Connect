"use client";

import { useEffect } from "react";

const RESET_FLAG = "reliefconnect-sw-reset";

export function DevServiceWorkerReset() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    if (window.sessionStorage.getItem(RESET_FLAG)) {
      return;
    }

    window.sessionStorage.setItem(RESET_FLAG, "true");

    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .then(() => (window.caches ? window.caches.keys().then((keys) => Promise.all(keys.map((key) => window.caches.delete(key)))) : undefined))
      .then(() => {
        window.location.reload();
      });
  }, []);

  return null;
}