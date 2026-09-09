"use client";

import { useEffect, useState, useRef, use, useMemo } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import { format } from "date-fns";
import Link from "next/link";
import useSWR from "swr";
import { getAvatarUrl } from "@/lib/avatar";

type Message = {
  id: string;
  senderId: string;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  sender: {
    id: string;
    name: string;
    role: string;
    image: string | null;
  };
};

type MemberInfo = {
  id: string;
  name: string;
  image: string | null;
  role: string;
  isVerified?: boolean;
  createdAt?: string;
};

type RequestDetails = {
  id: string;
  title: string;
  category: string;
  urgency: string;
  status: string;
  requesterId: string;
  requester: MemberInfo;
  assignedVolunteers: MemberInfo | null;
  claims?: { id: string; volunteer: MemberInfo; createdAt?: string }[];
};

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to load data");
  return res.json();
});

export default function ChatRoomPage({ params }: { params: Promise<{ requestId: string }> }) {
  const unwrappedParams = use(params);
  const requestId = unwrappedParams.requestId;

  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute distinct group members (requester, assigned volunteer, claims, coordinators, active senders)
  const groupMembers = useMemo(() => {
    const membersMap = new Map<string, MemberInfo & { tag?: string }>();

    if (requestDetails?.requester) {
      membersMap.set(requestDetails.requester.id, {
        ...requestDetails.requester,
        tag: "Requester",
      });
    }

    if (requestDetails?.assignedVolunteers) {
      membersMap.set(requestDetails.assignedVolunteers.id, {
        ...requestDetails.assignedVolunteers,
        tag: membersMap.has(requestDetails.assignedVolunteers.id) ? "Requester" : "Assigned Volunteer",
      });
    }

    if (Array.isArray(requestDetails?.claims)) {
      requestDetails.claims.forEach((c) => {
        if (c.volunteer) {
          const existing = membersMap.get(c.volunteer.id);
          membersMap.set(c.volunteer.id, {
            ...c.volunteer,
            tag: existing ? existing.tag : "Volunteer",
          });
        }
      });
    }

    // Include current session user so their profile and avatar are always represented
    if (session?.user?.id) {
      const existing = membersMap.get(session.user.id);
      if (!existing) {
        membersMap.set(session.user.id, {
          id: session.user.id,
          name: session.user.name || "You",
          image: session.user.image || null,
          role: session.user.role || "USER",
          tag: session.user.role === "COORDINATOR" ? "Coordinator" : session.user.role,
        });
      } else if (!existing.image && session.user.image) {
        membersMap.set(session.user.id, {
          ...existing,
          image: session.user.image,
        });
      }
    }

    // Include any sender from chat messages
    messages.forEach((m) => {
      if (m.sender) {
        const existing = membersMap.get(m.sender.id);
        if (!existing) {
          membersMap.set(m.sender.id, {
            id: m.sender.id,
            name: m.sender.name,
            image: m.sender.image,
            role: m.sender.role,
            tag: m.sender.role === "COORDINATOR" ? "Coordinator" : m.sender.role,
          });
        } else if (!existing.image && m.sender.image) {
          membersMap.set(m.sender.id, {
            ...existing,
            image: m.sender.image,
          });
        }
      }
    });

    return Array.from(membersMap.values());
  }, [requestDetails, session, messages]);

  // Strictly unique messages to prevent duplicate keys in React render
  const uniqueMessages = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [messages]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Dismiss context menu on click
  useEffect(() => {
    const handleClickOutside = () => setSelectedMessageId(null);
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("scroll", handleClickOutside, { capture: true });
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("scroll", handleClickOutside, { capture: true });
    };
  }, []);

  const [isSending, setIsSending] = useState(false);

  const { data: initialData, error: swrError, isLoading: isSwrLoading, mutate } = useSWR(
    session?.user?.id ? `/api/messages/${requestId}` : null,
    fetcher,
    { refreshInterval: 2000, revalidateOnFocus: true }
  );

  useEffect(() => {
    if (initialData) {
      if (initialData.request) {
        setRequestDetails(initialData.request);
      }
      if (Array.isArray(initialData.messages)) {
        setMessages((prev) => {
          // If previous messages have temp optimistic items, merge them safely
          const serverIds = new Set(initialData.messages.map((m: Message) => m.id));
          const pendingOptimistic = prev.filter((m) => m.id.startsWith("temp-") && !serverIds.has(m.id));
          const combined = [...initialData.messages, ...pendingOptimistic];

          // Deduplicate strictly by message ID
          const seen = new Set<string>();
          return combined.filter((m) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          });
        });
      }
      setIsLoading(false);
    }
  }, [initialData]);

  useEffect(() => {
    if (swrError) {
      setError(swrError.message);
      setIsLoading(false);
    }
  }, [swrError]);

  useEffect(() => {
    if (isSwrLoading && messages.length === 0) setIsLoading(true);
    else setIsLoading(false);
  }, [isSwrLoading, messages.length]);

  // Setup Socket if custom socket server is configured
  useEffect(() => {
    if (!session?.user?.id) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) return;

    try {
      const newSocket = io(socketUrl, {
        transports: ["websocket", "polling"],
        timeout: 4000,
        reconnectionAttempts: 2,
      });
      setSocket(newSocket);

      newSocket.on("connect", () => {
        newSocket.emit("join_request_room", requestId);
      });

      newSocket.on("receive_message", (msg: Message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          // Clear any matching optimistic temp item
          const withoutMatchingTemp = prev.filter(
            (m) => !(m.id.startsWith("temp-") && m.senderId === msg.senderId && m.content === msg.content)
          );
          return [...withoutMatchingTemp, msg];
        });
      });

      newSocket.on("message_edited", (editedMsg: Message) => {
        setMessages((prev) => prev.map(m => m.id === editedMsg.id ? editedMsg : m));
      });

      newSocket.on("message_deleted", (deletedMsg: Message) => {
        setMessages((prev) => prev.map(m => m.id === deletedMsg.id ? deletedMsg : m));
      });

      return () => {
        newSocket.emit("leave_request_room", requestId);
        newSocket.disconnect();
      };
    } catch (err) {
      console.warn("Socket connection skipped:", err);
    }
  }, [session?.user?.id, requestId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !session?.user?.id || isSending) return;

    if (editingMessageId) {
      const messageId = editingMessageId;
      const content = newMessage.trim();
      setEditingMessageId(null);
      setNewMessage("");

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content, isEdited: true } : m))
      );

      try {
        const res = await fetch(`/api/messages/${requestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, content }),
        });
        if (res.ok) {
          const updated = await res.json();
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          mutate();
        }
      } catch (err) {
        console.error("Edit failed:", err);
      }

      if (socket && socket.connected) {
        socket.emit("edit_message", { messageId, senderId: session.user.id, content });
      }
      return;
    }

    const content = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    // Optimistic message: SHOW INSTANTLY ON SCREEN
    const tempId = "temp-" + Date.now();
    const optimisticMessage: Message = {
      id: tempId,
      senderId: session.user.id,
      content,
      imageUrl: null,
      createdAt: new Date().toISOString(),
      sender: {
        id: session.user.id,
        name: session.user.name || "You",
        role: session.user.role || "VICTIM",
        image: session.user.image || null,
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await fetch(`/api/messages/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const savedMessage: Message = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === savedMessage.id)) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) => (m.id === tempId ? savedMessage : m));
        });
        mutate();

        if (socket && socket.connected) {
          socket.emit("send_message", {
            requestId,
            senderId: session.user.id,
            content,
            message: savedMessage,
          });
        }
      } else {
        const err = await res.json().catch(() => null);
        console.error("Message send failed:", err);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        alert(err?.error || "Failed to send message.");
      }
    } catch (err: any) {
      console.error("Network error sending message:", err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert("Network error: Could not send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!session?.user?.id) return;
    
    if (confirm("Are you sure you want to delete this message?")) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true, content: null, imageUrl: null } : m))
      );

      try {
        const res = await fetch(`/api/messages/${requestId}?messageId=${messageId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          mutate();
        }
      } catch (err) {
        console.error("Delete failed:", err);
      }

      if (socket && socket.connected) {
        socket.emit("delete_message", { messageId, senderId: session.user.id });
      }
    }
  };

  const handleEditInitiate = (msg: Message) => {
    setEditingMessageId(msg.id);
    setNewMessage(msg.content || "");
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setNewMessage("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large (max 5MB)");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      const tempId = "temp-" + Date.now();
      const optimisticMsg: Message = {
        id: tempId,
        senderId: session.user.id,
        content: null,
        imageUrl: data.url,
        createdAt: new Date().toISOString(),
        sender: {
          id: session.user.id,
          name: session.user.name || "You",
          role: session.user.role || "VICTIM",
          image: session.user.image || null,
        },
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      const msgRes = await fetch(`/api/messages/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: data.url }),
      });

      if (msgRes.ok) {
        const saved = await msgRes.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === saved.id)) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) => (m.id === tempId ? saved : m));
        });
        mutate();

        if (socket && socket.connected) {
          socket.emit("send_message", {
            requestId,
            senderId: session.user.id,
            imageUrl: data.url,
            message: saved,
          });
        }
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        alert("Failed to send image.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-sm text-[color:var(--foreground)]/50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#38bdf8] mb-4 border-t-transparent"></div>
        Loading chat history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-sm text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex h-[100dvh] w-full flex-col bg-[color:var(--background)] md:static md:z-auto md:h-auto md:w-auto md:flex-1 md:min-w-0 md:bg-[color:var(--surface)]/50">
      
      {/* Header - Group Chat */}
      <div className="border-b border-[color:var(--border)] p-3 sm:p-4 bg-[color:var(--surface)]/80 backdrop-blur-xl flex items-center justify-between gap-3">
         <div className="flex items-center gap-3 min-w-0">
           <Link href="/messages" className="md:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-strong)] text-[color:var(--foreground)]/70">
             <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
             </svg>
           </Link>

            {(() => {
              const requesterRawImage = requestDetails?.requester?.image || (requestDetails?.requesterId === session?.user?.id ? session?.user?.image : null);
              const requesterAvatarUrl = getAvatarUrl(requesterRawImage);
              const requesterName = requestDetails?.requester?.name || "Relief Group";

              return (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#38bdf8]/20 to-sky-500/30 border border-[#38bdf8]/30 overflow-hidden text-lg shadow-sm">
                  {requesterAvatarUrl ? (
                    <img
                      src={requesterAvatarUrl}
                      alt={requesterName}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                        const fallback = e.currentTarget.parentElement?.querySelector(".header-fallback") as HTMLElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <span
                    className="header-fallback flex items-center justify-center font-bold text-sm text-[#38bdf8]"
                    style={{ display: requesterAvatarUrl ? "none" : "flex" }}
                  >
                    {requesterName?.charAt(0)?.toUpperCase() || "👥"}
                  </span>
                </div>
              );
            })()}

           <div className="min-w-0 flex-1">
             <div className="flex items-center gap-2">
               <h1 className="truncate font-bold text-sm sm:text-base text-[color:var(--foreground)]" title={requestDetails?.title}>
                 {requestDetails?.title || "Relief Group Chat"}
               </h1>
               {requestDetails?.status && (
                 <span className="shrink-0 text-[10px] uppercase tracking-wider font-bold bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20 px-1.5 py-0.5 rounded">
                   {requestDetails.status}
                 </span>
               )}
             </div>

             <div className="flex items-center gap-2 mt-0.5 text-xs text-[color:var(--foreground)]/60">
               <button
                 type="button"
                 onClick={() => setShowMembersModal(true)}
                 className="flex items-center gap-1.5 font-medium hover:text-[#38bdf8] transition-colors text-left"
               >
                 <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span>{groupMembers.length} group {groupMembers.length === 1 ? "member" : "members"}</span>
                 <span className="text-[11px] underline underline-offset-2 text-[#38bdf8]">(View)</span>
               </button>
               <span>•</span>
               <span className="capitalize truncate text-[color:var(--foreground)]/50">{requestDetails?.category || "Request"}</span>
             </div>
           </div>
         </div>

         <div className="flex items-center gap-2 shrink-0">
           <button
             type="button"
             onClick={() => setShowMembersModal(true)}
             className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--surface-strong)] px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground)] transition hover:bg-[color:var(--border)] border border-[color:var(--border)]"
             title="View who is in this group"
           >
             <span>👥</span>
             <span className="hidden sm:inline">Members</span>
             <span className="rounded-full bg-[#38bdf8]/20 text-[#38bdf8] px-1.5 py-0.2 text-[10px] font-bold">{groupMembers.length}</span>
           </button>

           <Link 
             href={`/requests/${requestDetails?.id || requestId}`}
             className="hidden sm:inline-flex items-center justify-center rounded-full bg-[color:var(--surface-strong)] px-3.5 py-1.5 text-xs font-semibold text-[color:var(--foreground)] transition hover:bg-[color:var(--border)] border border-[color:var(--border)]"
           >
             View Request
           </Link>
         </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 pt-6 sm:pt-8 space-y-4">
        {uniqueMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-[color:var(--foreground)]/50">
            <span className="text-4xl mb-4">👋</span>
            <p className="text-sm font-medium">Welcome to the live group chat for &ldquo;{requestDetails?.title || "this request"}&rdquo;!</p>
            <p className="text-xs text-[color:var(--foreground)]/40 mt-1">Coordinate response efforts with all volunteers and coordinators.</p>
          </div>
        ) : (
          uniqueMessages.map((msg, index) => {
            const isMine = msg.senderId === session?.user?.id;
            const isFirstInCluster = index === 0 || uniqueMessages[index - 1].senderId !== msg.senderId;
            const isLastInCluster = index === uniqueMessages.length - 1 || uniqueMessages[index + 1].senderId !== msg.senderId;

            // Resolve avatar with fallbacks: session user image (if mine) -> message sender image -> groupMembers match
            const memberWithImage = groupMembers.find((m) => m.id === msg.senderId && m.image);
            const rawAvatar = (isMine && session?.user?.image) || msg.sender?.image || memberWithImage?.image || null;
            const avatarUrl = getAvatarUrl(rawAvatar);
            const senderName = msg.sender?.name || (isMine ? session?.user?.name : "User") || "User";

            return (
              <div key={msg.id} className={`flex w-full group/row ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[85%] sm:max-w-[70%] items-end gap-2 group/bubble relative ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                  
                  {/* Avatar (visible for both incoming and own sent messages) */}
                  {isLastInCluster ? (
                    <Link
                      href={isMine ? "/profile" : `/profile/${msg.senderId}`}
                      title={isMine ? "View your profile" : `View ${senderName}'s profile`}
                      className="shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[color:var(--surface-strong)] overflow-hidden shadow-sm border border-[color:var(--border)] transition hover:ring-2 hover:ring-[#38bdf8] flex items-center justify-center"
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={senderName}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                            const fallback = e.currentTarget.parentElement?.querySelector(".msg-avatar-fallback") as HTMLElement;
                            if (fallback) fallback.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <span
                        className="msg-avatar-fallback h-full w-full items-center justify-center text-[11px] font-bold text-sky-400 bg-sky-500/20"
                        style={{ display: avatarUrl ? "none" : "flex" }}
                      >
                        {senderName?.charAt(0)?.toUpperCase() || "👤"}
                      </span>
                    </Link>
                  ) : (
                    <div className="shrink-0 w-7 sm:w-8" aria-hidden="true" />
                  )}

                  {/* 3-dots action button on hover for own messages */}
                  {isMine && !msg.isDeleted && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id);
                      }}
                      className="opacity-0 group-hover/bubble:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-[color:var(--surface-strong)] text-[color:var(--foreground)]/50 hover:text-[color:var(--foreground)] shrink-0 self-center"
                      title="Edit or Delete message"
                      aria-label="Message options"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  )}

                  {/* Bubble */}
                  <div 
                    className="relative flex flex-col gap-1 min-w-0 cursor-pointer"
                    onClick={(e) => {
                      if (isMine && !msg.isDeleted) {
                        e.stopPropagation();
                        setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id);
                      }
                    }}
                    onContextMenu={(e) => {
                      if (isMine && !msg.isDeleted) {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedMessageId(msg.id);
                      }
                    }}
                  >
                    {isFirstInCluster && !isMine && (
                      <div className="flex items-center gap-1.5 ml-1 mb-0.5">
                        <Link 
                          href={`/profile/${msg.senderId}`}
                          className="text-[11px] font-semibold text-[color:var(--foreground)]/90 hover:text-[#38bdf8] transition-colors"
                        >
                          {senderName}
                        </Link>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[color:var(--surface-strong)] text-[color:var(--foreground)]/60 uppercase font-semibold border border-[color:var(--border)]">
                          {msg.sender?.role || "MEMBER"}
                        </span>
                      </div>
                    )}
                    
                    {msg.isDeleted ? (
                      <div className="relative rounded-2xl px-4 py-2.5 text-sm shadow-sm break-words overflow-hidden border border-[color:var(--border)] bg-[color:var(--surface)]/50 text-[color:var(--foreground)]/50 italic flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        This message was deleted
                      </div>
                    ) : (
                      <div
                        className={`relative rounded-2xl px-4 py-2.5 text-sm shadow-md break-words overflow-hidden transition-all ${
                          isMine
                            ? "bg-[#38bdf8] text-[#13151A] rounded-br-sm font-medium"
                            : "bg-[color:var(--surface)] text-[color:var(--foreground)] border border-[color:var(--border)] rounded-bl-sm"
                        } ${
                          selectedMessageId === msg.id ? "ring-4 ring-black/20 dark:ring-white/20 brightness-110 scale-[1.02]" : "hover:shadow-lg"
                        }`}
                      >
                        {msg.imageUrl && (
                          <div className="mb-2 max-w-xs sm:max-w-sm overflow-hidden rounded-xl bg-black/10">
                            <img src={msg.imageUrl} alt="Attachment" className="max-h-64 object-contain w-full" />
                          </div>
                        )}
                        {msg.content}
                        {msg.isEdited && (
                          <span className="inline-block ml-2 text-[10px] opacity-70">
                            (edited)
                          </span>
                        )}
                      </div>
                    )}
                    
                    <span className={`text-[10px] text-[color:var(--foreground)]/50 ${isMine ? "text-right mr-1" : "ml-1"}`}>
                      {format(new Date(msg.createdAt), "h:mm a")}
                    </span>

                    {/* Context Menu Popover: Position below if first message, otherwise above */}
                    {selectedMessageId === msg.id && (
                      <div
                        className={`absolute ${
                          index <= 1 ? "top-full mt-2" : "bottom-full mb-2"
                        } right-0 z-50 flex items-center gap-1 bg-[color:var(--surface)] border border-[color:var(--border)] p-1.5 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150`}
                      >
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleEditInitiate(msg); setSelectedMessageId(null); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-[color:var(--surface-strong)] text-[color:var(--foreground)] text-xs font-semibold transition-colors"
                        >
                          <svg className="h-3.5 w-3.5 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          <span>Edit</span>
                        </button>
                        <div className="w-[1px] h-5 bg-[color:var(--border)]" />
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); setSelectedMessageId(null); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-red-500/10 text-red-500 text-xs font-semibold transition-colors"
                        >
                          <svg className="h-3.5 w-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-[color:var(--border)] bg-[color:var(--surface)]/80 backdrop-blur-xl flex flex-col">
        {editingMessageId && (
          <div className="bg-[color:var(--surface-strong)]/50 px-4 py-2 text-xs text-[color:var(--foreground)]/70 flex items-center justify-between border-b border-[color:var(--border)]/50">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Editing message
            </div>
            <button onClick={cancelEdit} className="hover:text-[color:var(--foreground)] font-medium transition-colors">
              Cancel
            </button>
          </div>
        )}
        <div className="p-3 sm:p-5 flex items-center gap-2">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            type="button"
            disabled={isUploading || !!editingMessageId}
            onClick={() => fileInputRef.current?.click()}
            className="focus-ring flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-strong)] text-[color:var(--foreground)]/70 transition hover:text-[color:var(--foreground)] hover:bg-[color:var(--border)] disabled:opacity-50"
            title="Attach photo"
          >
            {isUploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--foreground)]/50 border-t-transparent"></div>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          <form onSubmit={handleSendMessage} className="flex flex-1 gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="focus-ring w-full rounded-full border border-[color:var(--border)] bg-[color:var(--muted)] px-5 py-3 text-sm outline-none transition hover:border-[color:var(--border-strong)] focus:border-[#38bdf8] focus:bg-[color:var(--surface)] text-[color:var(--foreground)] shadow-inner"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() && !isUploading}
              className="focus-ring flex shrink-0 items-center justify-center rounded-full bg-[#38bdf8] px-6 text-sm font-bold text-[#13151A] shadow-md transition hover:bg-[#7dd3fc] disabled:opacity-50 hover:shadow-lg hover:-translate-y-0.5"
            >
              {editingMessageId ? "Save" : "Send"}
            </button>
          </form>
        </div>
      </div>

      {/* Group Members Modal */}
      {showMembersModal && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowMembersModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-3xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[color:var(--border)]">
              <div>
                <h3 className="text-base font-bold text-[color:var(--foreground)] flex items-center gap-2">
                  <span>👥</span>
                  <span>Group Members</span>
                  <span className="text-xs bg-[#38bdf8]/15 text-[#38bdf8] px-2 py-0.5 rounded-full font-bold">
                    {groupMembers.length}
                  </span>
                </h3>
                <p className="text-xs text-[color:var(--foreground)]/60 mt-0.5 truncate max-w-xs">
                  {requestDetails?.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMembersModal(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center bg-[color:var(--surface-strong)] hover:bg-[color:var(--border)] text-[color:var(--foreground)]/70 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {groupMembers.length === 0 ? (
                <div className="p-4 text-center text-xs text-[color:var(--foreground)]/50">
                  No group members found.
                </div>
              ) : (
                groupMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[color:var(--surface-strong)]/50 border border-[color:var(--border)] hover:border-[color:var(--border-strong)] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Link href={`/profile/${member.id}`} className="shrink-0" onClick={() => setShowMembersModal(false)}>
                        <div className="h-10 w-10 rounded-full bg-[color:var(--surface)] border border-[color:var(--border)] overflow-hidden flex items-center justify-center transition hover:ring-2 hover:ring-[#38bdf8]">
                          {member.image ? (
                            <img
                              src={getAvatarUrl(member.image)!}
                              alt={member.name}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                                const fallback = e.currentTarget.parentElement?.querySelector(".member-fallback") as HTMLElement;
                                if (fallback) fallback.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <span
                            className="member-fallback h-full w-full items-center justify-center text-sm font-bold text-sky-400 bg-sky-500/20"
                            style={{ display: member.image ? "none" : "flex" }}
                          >
                            {member.name?.charAt(0)?.toUpperCase() || "👤"}
                          </span>
                        </div>
                      </Link>
                      <div className="min-w-0">
                        <Link
                          href={`/profile/${member.id}`}
                          onClick={() => setShowMembersModal(false)}
                          className="font-semibold text-sm text-[color:var(--foreground)] truncate block hover:text-[#38bdf8] transition-colors"
                        >
                          {member.name} {member.id === session?.user?.id && <span className="text-xs text-[#38bdf8] font-normal">(You)</span>}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[color:var(--surface)] border border-[color:var(--border)] text-[color:var(--foreground)]/70">
                            {member.tag || member.role}
                          </span>
                          {member.isVerified && (
                            <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-0.5">
                              ✓ Verified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/profile/${member.id}`}
                      onClick={() => setShowMembersModal(false)}
                      className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[color:var(--surface)] hover:bg-[#38bdf8] hover:text-[#13151A] text-xs font-semibold text-[color:var(--foreground)] border border-[color:var(--border)] transition-all"
                    >
                      Profile →
                    </Link>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[color:var(--border)] flex justify-end">
              <button
                type="button"
                onClick={() => setShowMembersModal(false)}
                className="px-4 py-2 rounded-full bg-[color:var(--surface-strong)] hover:bg-[color:var(--border)] text-xs font-semibold text-[color:var(--foreground)] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
