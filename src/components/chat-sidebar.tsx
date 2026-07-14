"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useParams } from "next/navigation";

type ChatPreview = {
  id: string;
  title: string;
  requesterId: string;
  requester: { id: string; name: string; image: string | null; role: string };
  assignedVolunteers: { id: string; name: string; image: string | null; role: string } | null;
  messages: { content: string; createdAt: string }[];
  updatedAt: string;
};

export function ChatSidebar() {
  const { data: session } = useSession();
  const params = useParams();
  const selectedChatId = params?.requestId as string | undefined;

  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    fetch("/api/messages")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load messages");
        return res.json();
      })
      .then((data) => {
        setChats(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setIsLoading(false);
      });
  }, [session?.user?.id]);

  return (
    <div className={`w-full md:w-80 shrink-0 flex-col border border-[color:var(--border)] md:border-y-0 md:border-l-0 md:border-r rounded-2xl md:rounded-none bg-[color:var(--surface)]/30 overflow-y-auto ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
      <div className="p-5 border-b border-[color:var(--border)] sticky top-0 bg-[color:var(--surface)]/80 backdrop-blur-md z-10">
        <h2 className="text-lg font-bold text-[color:var(--foreground)] tracking-tight">Messages</h2>
      </div>

      <div className="p-3">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[color:var(--foreground)]/50">Loading conversations...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-500">{error}</div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="text-4xl">💬</div>
            <h3 className="mt-4 text-sm font-semibold text-[color:var(--foreground)]">No active conversations</h3>
            <p className="mt-2 text-xs text-[color:var(--foreground)]/50">You don't have any active chats yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {chats.map((chat) => {
              const isRequester = chat.requesterId === session?.user?.id;
              const otherPerson = isRequester 
                ? (chat.assignedVolunteers || null)
                : chat.requester;
              
              const lastMessage = chat.messages[0];
              const isSelected = selectedChatId === chat.id;

              return (
                <Link
                  key={chat.id}
                  href={`/messages/${chat.id}`}
                  className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-200 border ${isSelected ? 'bg-[color:var(--surface-strong)] border-[color:var(--border-strong)] shadow-sm' : 'border-transparent hover:bg-[color:var(--surface)] hover:border-[color:var(--border)]'}`}
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]">
                    {otherPerson?.image ? (
                      <img src={otherPerson.image} alt={otherPerson.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-[color:var(--foreground)]/50">👤</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-[color:var(--foreground)]">
                        {otherPerson ? otherPerson.name : "Waiting..."}
                      </h3>
                      <span className="shrink-0 text-[10px] text-[color:var(--foreground)]/40">
                        {lastMessage ? formatDistanceToNow(new Date(lastMessage.createdAt)) : ''}
                      </span>
                    </div>
                    <p className="truncate text-[10px] font-medium text-[#38bdf8] mb-0.5">{chat.title}</p>
                    <p className="truncate text-xs text-[color:var(--foreground)]/60">
                      {lastMessage ? lastMessage.content : "Say hi!"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
