import { AppShell } from "@/components/app-shell";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ScrollLock } from "@/components/scroll-lock";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages",
};

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell title="Live Chat" subtitle="Communicate directly to coordinate relief efforts.">
      <ScrollLock />
      <div className="mx-auto flex w-full max-w-6xl h-[calc(100dvh-12rem)] md:h-[calc(100dvh-9rem)] md:overflow-hidden md:rounded-3xl md:border md:border-[color:var(--border)] md:bg-[color:var(--muted)]/50 md:shadow-2xl md:backdrop-blur-2xl">
        <ChatSidebar />
        {children}
      </div>
    </AppShell>
  );
}
