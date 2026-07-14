"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { ThemeProvider } from "./theme-provider";
import { DevServiceWorkerReset } from "./dev-service-worker-reset";
import { PushManager } from "./push-manager";
import { I18nProvider } from "./i18n-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </I18nProvider>
      <DevServiceWorkerReset />
      <PushManager />
    </SessionProvider>
  );
}