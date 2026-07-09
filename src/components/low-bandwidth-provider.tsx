"use client";

import { createContext, useContext, useState, useEffect } from "react";

type LowBandwidthContextType = {
  isLowBandwidth: boolean;
  toggleLowBandwidth: () => void;
};

const LowBandwidthContext = createContext<LowBandwidthContextType>({
  isLowBandwidth: false,
  toggleLowBandwidth: () => {},
});

export function LowBandwidthProvider({ children }: { children: React.ReactNode }) {
  const [isLowBandwidth, setIsLowBandwidth] = useState(false);

  useEffect(() => {
    // Check local storage on mount
    const stored = localStorage.getItem("low-bandwidth-mode");
    if (stored === "true") {
      setIsLowBandwidth(true);
    } else if (stored !== "false") {
      // Auto-detect based on connection object if available
      if (typeof navigator !== "undefined" && "connection" in navigator) {
        const conn = (navigator as any).connection;
        if (conn.saveData || ["slow-2g", "2g", "3g"].includes(conn.effectiveType)) {
          setIsLowBandwidth(true);
        }
      }
    }
  }, []);

  const toggleLowBandwidth = () => {
    setIsLowBandwidth((prev) => {
      const next = !prev;
      localStorage.setItem("low-bandwidth-mode", String(next));
      return next;
    });
  };

  return (
    <LowBandwidthContext.Provider value={{ isLowBandwidth, toggleLowBandwidth }}>
      {children}
    </LowBandwidthContext.Provider>
  );
}

export function useLowBandwidth() {
  return useContext(LowBandwidthContext);
}
