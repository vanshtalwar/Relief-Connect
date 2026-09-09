"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useParams } from "next/navigation";
import useSWR from "swr";
import io from "socket.io-client";
import { getAvatarUrl } from "@/lib/avatar";

type ChatPreview = {
  id: string;
  title: string;
  requesterId: string;
  requester: { id: string; name: string; image: string | null; role: string };
  assignedVolunteers: { id: string; name: string; image: string | null; role: string } | null;
  claims?: { volunteer: { id: string; name: string; image: string | null; role: string } }[];
  messages: {
    id: string;
    content: string | null;
    imageUrl?: string | null;
    createdAt: string;
    senderId?: string;
  }[];
  updatedAt: string;
};

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to load messages");
  return res.json();
});

export function ChatSidebar() {
  const { data: session } = useSession();
  const params = useParams();
  const selectedChatId = params?.requestId as string | undefined;

  const { data: chats, error, isLoading, mutate } = useSWR<ChatPreview[]>(
    session?.user?.id ? "/api/messages" : null,
    fetcher,
    { refreshInterval: 3000, revalidateOnFocus: true }
  );

  const storageKey = session?.user?.id ? `relief_chat_last_read_${session.user.id}` : null;
  const [lastReadMap, setLastReadMap] = useState<Record<string, number>>({});

  // Load last read timestamps from localStorage on mount
  useEffect(() => {
    if (!storageKey) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setLastReadMap(JSON.parse(stored));
      }
    } catch {}
  }, [storageKey]);

  // Mark currently open chat as read
  useEffect(() => {
    if (!selectedChatId || !storageKey) return;
    const now = Date.now();
    setLastReadMap((prev) => {
      const next = { ...prev, [selectedChatId]: now };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [selectedChatId, storageKey]);

  // Realtime Socket listener to revalidate and detect unread messages immediately
  useEffect(() => {
    if (!session?.user?.id) return;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) return;

    try {
      const socket = io(socketUrl, {
        transports: ["websocket", "polling"],
        timeout: 4000,
        reconnectionAttempts: 2,
      });

      socket.on("connect", () => {
        socket.emit("join_user_room", session.user.id);
      });

      socket.on("new_chat_notification", () => {
        mutate();
      });

      socket.on("receive_message", () => {
        mutate();
      });

      return () => {
        socket.disconnect();
      };
    } catch (err) {
      console.warn("Sidebar socket notification listener skipped:", err);
    }
  }, [session?.user?.id, mutate]);

  // Count total unread chats
  const totalUnreadCount = useMemo(() => {
    if (!chats || !session?.user?.id) return 0;
    return chats.reduce((count, chat) => {
      const isSelected = selectedChatId === chat.id;
      const lastMsg = chat.messages?.[0];
      if (
        !isSelected &&
        lastMsg &&
        lastMsg.senderId !== session.user.id &&
        new Date(lastMsg.createdAt).getTime() > (lastReadMap[chat.id] || 0)
      ) {
        return count + 1;
      }
      return count;
    }, 0);
  }, [chats, selectedChatId, session?.user?.id, lastReadMap]);

  return (
    <div className={`w-full md:w-80 shrink-0 flex-col border border-[color:var(--border)] md:border-y-0 md:border-l-0 md:border-r rounded-2xl md:rounded-none bg-[color:var(--surface)]/30 overflow-y-auto ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
      <div className="p-4 sm:p-5 border-b border-[color:var(--border)] sticky top-0 bg-[color:var(--surface)]/90 backdrop-blur-md z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-[color:var(--foreground)] tracking-tight">Group Chats</h2>
          {totalUnreadCount > 0 && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-500 text-white shadow-sm animate-pulse"
              title={`${totalUnreadCount} group(s) with unread messages`}
            >
              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0-2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
              {totalUnreadCount}
            </span>
          )}
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20">
          Live
        </span>
      </div>

      <div className="p-3">
        {isLoading || !chats ? (
          <div className="p-8 text-center text-sm text-[color:var(--foreground)]/50">Loading conversations...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-500">{error.message || "Error loading"}</div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="text-4xl">💬</div>
            <h3 className="mt-4 text-sm font-semibold text-[color:var(--foreground)]">No active group chats</h3>
            <p className="mt-2 text-xs text-[color:var(--foreground)]/50">You don't have any active relief chats yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {chats.map((chat) => {
              // Calculate distinct member count
              const memberIds = new Set<string>();
              if (chat.requester?.id) memberIds.add(chat.requester.id);
              if (chat.assignedVolunteers?.id) memberIds.add(chat.assignedVolunteers.id);
              if (Array.isArray(chat.claims)) {
                chat.claims.forEach((c) => {
                  if (c.volunteer?.id) memberIds.add(c.volunteer.id);
                });
              }
              const memberCount = memberIds.size || 1;
              
              const lastMessage = chat.messages?.[0];
              const isSelected = selectedChatId === chat.id;

              // Check if unread (new message from someone other than active user)
              const isUnread = Boolean(
                !isSelected &&
                lastMessage &&
                lastMessage.senderId !== session?.user?.id &&
                new Date(lastMessage.createdAt).getTime() > (lastReadMap[chat.id] || 0)
              );

              return (
                <Link
                  key={chat.id}
                  href={`/messages/${chat.id}`}
                  onClick={() => {
                    if (storageKey) {
                      const now = Date.now();
                      setLastReadMap((prev) => {
                        const next = { ...prev, [chat.id]: now };
                        try {
                          localStorage.setItem(storageKey, JSON.stringify(next));
                        } catch {}
                        return next;
                      });
                    }
                  }}
                  className={`group relative flex items-start gap-3 p-3 rounded-2xl transition-all duration-200 border ${
                    isSelected
                      ? 'bg-[color:var(--surface-strong)] border-[#38bdf8]/50 shadow-md ring-1 ring-[#38bdf8]/30'
                      : isUnread
                      ? 'bg-sky-500/[0.08] dark:bg-sky-500/[0.12] border-sky-400/40 hover:bg-sky-500/[0.15] shadow-sm ring-1 ring-sky-400/20'
                      : 'border-transparent hover:bg-[color:var(--surface)] hover:border-[color:var(--border)]'
                  }`}
                >
                  {/* Avatar with Message Notification Icon Badge */}
                  <div
                    className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border flex items-center justify-center text-lg shadow-sm transition-all ${
                      isUnread
                        ? 'border-[#38bdf8] bg-gradient-to-br from-[#38bdf8]/25 to-sky-500/30 ring-2 ring-[#38bdf8]/40 shadow-sky-500/20 shadow-md'
                        : 'border-[color:var(--border)] bg-gradient-to-br from-[#38bdf8]/15 to-sky-500/20'
                    }`}
                  >
                    {(() => {
                      const requesterRaw = chat.requester?.image || (chat.requesterId === session?.user?.id ? session?.user?.image : null);
                      const requesterAvatar = getAvatarUrl(requesterRaw);
                      const requesterInitial = chat.requester?.name?.charAt(0)?.toUpperCase() || "👥";

                      return (
                        <>
                          {requesterAvatar ? (
                            <img
                              src={requesterAvatar}
                              alt={chat.requester?.name || "Requester"}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                                const fallback = e.currentTarget.parentElement?.querySelector(".sidebar-fallback") as HTMLElement;
                                if (fallback) fallback.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <span
                            className="sidebar-fallback flex items-center justify-center font-bold text-xs text-[#38bdf8]"
                            style={{ display: requesterAvatar ? "none" : "flex" }}
                          >
                            {requesterInitial}
                          </span>
                        </>
                      );
                    })()}

                    {/* Prominent Floating Message Notification Icon */}
                    {isUnread && (
                      <span
                        className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 ring-2 ring-[color:var(--surface)] text-white shadow-md"
                        title="Unread message"
                      >
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                        <svg className="w-2.5 h-2.5 fill-current relative z-10" viewBox="0 0 24 24">
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0-2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                        </svg>
                      </span>
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={`truncate text-sm ${isUnread ? 'font-bold text-[color:var(--foreground)]' : 'font-semibold text-[color:var(--foreground)]'}`}
                        title={chat.title}
                      >
                        {chat.title}
                      </h3>
                      
                      {/* Unread Message Badge or Timestamp */}
                      {isUnread ? (
                        <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/50 text-sky-400 text-[9px] font-extrabold tracking-tight shadow-sm animate-pulse">
                          <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0-2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                          </svg>
                          <span>New</span>
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] text-[color:var(--foreground)]/40">
                          {lastMessage ? formatDistanceToNow(new Date(lastMessage.createdAt)) : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5 mb-1">
                      <span className="text-[10px] font-semibold text-[#38bdf8]">
                        {memberCount} {memberCount === 1 ? "member" : "members"}
                      </span>
                      <span className="text-[10px] text-[color:var(--foreground)]/30">•</span>
                      <span className="text-[10px] text-[color:var(--foreground)]/50 truncate">
                        by {chat.requester?.name || "User"}
                      </span>
                    </div>

                    {/* Preview Text with Unread indicator dot */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-sky-400 shrink-0 animate-pulse" />
                      )}
                      <p
                        className={`truncate text-xs ${
                          isUnread
                            ? 'font-bold text-[color:var(--foreground)]'
                            : 'text-[color:var(--foreground)]/60'
                        }`}
                      >
                        {lastMessage
                          ? (lastMessage.content || (lastMessage.imageUrl ? "📷 Photo attachment" : "Message"))
                          : "Say hello in group chat!"}
                      </p>
                    </div>
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

