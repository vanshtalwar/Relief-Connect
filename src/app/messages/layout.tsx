import { AppShell } from "@/components/app-shell";
import { ChatSidebar } from "@/components/chat-sidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages",
};

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell title="Live Chat" subtitle="Communicate directly to coordinate relief efforts.">
      <div className="mx-auto flex h-[calc(100vh-8rem)] w-full max-w-6xl overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--muted)]/50 shadow-2xl backdrop-blur-2xl">
        <ChatSidebar />
        {children}
      </div>
    </AppShell>
  );
}
