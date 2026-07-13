"use client";

export default function MessagesInboxPage() {
  return (
    <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center p-8 text-[color:var(--foreground)]/50">
      <div className="text-6xl mb-4 opacity-50">💬</div>
      <h3 className="text-lg font-medium text-[color:var(--foreground)] mb-2">Select a Conversation</h3>
      <p className="text-sm max-w-sm">Choose a chat from the sidebar to view the message history and continue your conversation.</p>
    </div>
  );
}
