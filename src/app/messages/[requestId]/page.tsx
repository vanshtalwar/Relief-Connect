"use client";

import { useEffect, useState, useRef, use } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import { format } from "date-fns";
import Link from "next/link";

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

type RequestDetails = {
  id: string;
  title: string;
  category: string;
  urgency: string;
  status: string;
  requesterId: string;
  requester: { id: string; name: string; image: string | null; role: string };
  assignedVolunteers: { id: string; name: string; image: string | null; role: string } | null;
};

export default function ChatRoomPage({ params }: { params: Promise<{ requestId: string }> }) {
  const unwrappedParams = use(params);
  const requestId = unwrappedParams.requestId;

  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Prevent body scroll when chat is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
    };
  }, []);

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

  // Load initial history
  useEffect(() => {
    if (!session?.user?.id) return;

    fetch(`/api/messages/${requestId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load history");
        return res.json();
      })
      .then((data) => {
        // Data contains { request, messages }
        if (data.request && data.messages) {
          setRequestDetails(data.request);
          setMessages(data.messages);
        } else if (Array.isArray(data)) {
          // Fallback if API hasn't fully updated or returns array
          setMessages(data);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [session?.user?.id, requestId]);

  // Setup Socket
  useEffect(() => {
    if (!session?.user?.id) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("join_request_room", requestId);
    });

    newSocket.on("receive_message", (msg: Message) => {
      setMessages((prev) => {
        // Prevent duplicate messages
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
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
  }, [session?.user?.id, requestId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !session?.user?.id) return;

    if (editingMessageId) {
      socket.emit("edit_message", {
        messageId: editingMessageId,
        senderId: session.user.id,
        content: newMessage.trim(),
      }, (response: any) => {
        if (!response.success) {
          console.error("Message edit failed:", response.error);
          alert("Failed to edit message. Please try again.");
        }
      });
      setEditingMessageId(null);
      setNewMessage("");
      return;
    }

    const payload = {
      requestId: requestId,
      senderId: session.user.id,
      content: newMessage.trim() || null,
    };
    
    socket.emit("send_message", payload, (response: any) => {
      if (!response.success) {
        console.error("Message send failed:", response.error);
        alert("Failed to send message. Please try again.");
      }
    });

    setNewMessage("");
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!socket || !session?.user?.id) return;
    
    if (confirm("Are you sure you want to delete this message?")) {
      socket.emit("delete_message", {
        messageId,
        senderId: session.user.id
      }, (response: any) => {
        if (!response.success) {
          console.error("Message delete failed:", response.error);
          alert("Failed to delete message.");
        }
      });
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
    if (!file || !socket || !session?.user?.id) return;

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

      const payload = {
        requestId: requestId,
        senderId: session.user.id,
        content: null,
        imageUrl: data.url,
      };

      socket.emit("send_message", payload, (response: any) => {
        if (!response.success) {
          console.error("Image send failed:", response.error);
          alert("Failed to send image.");
        }
      });
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

  // Determine who the "other" person is
  const isRequester = requestDetails?.requesterId === session?.user?.id;
  const otherPerson = isRequester 
    ? (requestDetails?.assignedVolunteers || null)
    : requestDetails?.requester;

  return (
    <div className="fixed inset-0 z-[100] flex h-[100dvh] w-full flex-col bg-[color:var(--background)] md:static md:z-auto md:h-auto md:w-auto md:flex-1 md:min-w-0 md:bg-[color:var(--surface)]/50">
      
      {/* Header */}
      <div className="border-b border-[color:var(--border)] p-4 bg-[color:var(--surface)]/80 backdrop-blur-xl flex items-center justify-between gap-3">
         <div className="flex items-center gap-3">
           <Link href="/messages" className="md:hidden flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--surface-strong)] text-[color:var(--foreground)]/70">
             <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
             </svg>
           </Link>
           <Link href={`/profile/${otherPerson?.id}`} className="block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[color:var(--surface-strong)] border border-[color:var(--border)] transition hover:ring-2 hover:ring-[#38bdf8]">
              {otherPerson?.image ? (
                <img src={otherPerson.image} alt={otherPerson.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[color:var(--foreground)]/50">👤</div>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/profile/${otherPerson?.id}`} className="block truncate font-semibold text-[color:var(--foreground)] transition hover:text-[#38bdf8]">
                {otherPerson ? otherPerson.name : "Waiting for volunteer..."}
              </Link>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="truncate text-xs font-medium text-[#38bdf8]">{requestDetails?.title}</span>
                {requestDetails?.status && (
                  <span className="text-[10px] uppercase tracking-wider font-bold bg-[color:var(--surface-strong)] px-1.5 py-0.5 rounded text-[color:var(--foreground)]/60">
                    {requestDetails.status}
                  </span>
                )}
              </div>
            </div>
         </div>
         <Link 
            href={`/requests/${requestDetails?.id}`}
            className="hidden sm:inline-flex items-center justify-center rounded-full bg-[color:var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[color:var(--foreground)] transition hover:bg-[color:var(--border)]"
          >
            View Request
          </Link>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-[color:var(--foreground)]/50">
            <span className="text-4xl mb-4">👋</span>
            <p className="text-sm font-medium">Say hello! Be the first to start the conversation.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMine = msg.senderId === session?.user?.id;
            const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;

            return (
              <div key={msg.id} className={`flex w-full group ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[85%] sm:max-w-[70%] items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                  
                  {/* Avatar */}
                  {!isMine && (
                    <div className="shrink-0 h-8 w-8 rounded-full bg-[color:var(--surface-strong)] overflow-hidden shadow-sm hidden sm:block border border-[color:var(--border)]">
                      {showAvatar && (
                        msg.sender.image ? (
                          <img src={msg.sender.image} alt={msg.sender.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-[color:var(--foreground)]/50">👤</div>
                        )
                      )}
                    </div>
                  )}

                  {/* Bubble */}
                  <div 
                    className="relative flex flex-col gap-1 min-w-0 cursor-pointer"
                    onContextMenu={(e) => {
                      if (isMine && !msg.isDeleted) {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedMessageId(msg.id);
                      }
                    }}
                  >
                    {showAvatar && !isMine && (
                      <span className="text-[10px] font-medium text-[color:var(--foreground)]/50 ml-1">{msg.sender.name}</span>
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

                    {/* Context Menu Popover */}
                    {selectedMessageId === msg.id && (
                      <div className="absolute bottom-full mb-1 right-0 z-50 flex items-center gap-1 bg-[color:var(--surface)] border border-[color:var(--border)] p-1.5 rounded-2xl shadow-xl shadow-black/10 animate-in fade-in zoom-in-95 duration-100">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditInitiate(msg); setSelectedMessageId(null); }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[color:var(--surface-strong)] text-[color:var(--foreground)] text-sm font-medium transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Edit
                        </button>
                        <div className="w-[1px] h-6 bg-[color:var(--border)]"></div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); setSelectedMessageId(null); }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-500 text-sm font-medium transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
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
    </div>
  );
}
