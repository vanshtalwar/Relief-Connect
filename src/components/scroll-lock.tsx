"use client";

import { useEffect } from "react";

export function ScrollLock() {
  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
        document.body.style.overscrollBehavior = "";
      }
    };
  }, []);

  return null;
}
