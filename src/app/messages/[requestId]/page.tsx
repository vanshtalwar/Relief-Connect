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
  assignedVolunteers: { id: string; name: string; image: string | null; role: string }[];
};

export default function ChatRoomPage({ params }: { params: Promise<{ requestId: string }> }) {
  const unwrappedParams = use(params);
  const requestId = unwrappedParams.requestId;

  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);
  const [newMessage, setNewMessage] = useState("");
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

    return () => {
      newSocket.emit("leave_request_room", requestId);
      newSocket.disconnect();
    };
  }, [session?.user?.id, requestId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !session?.user?.id) return;

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
    ? (requestDetails?.assignedVolunteers?.[0] || null)
    : requestDetails?.requester;

  return (
    <div className="flex flex-1 flex-col min-w-0 bg-[color:var(--surface)]/50">
      
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
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
              <div key={msg.id} className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
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
                  <div className="flex flex-col gap-1 min-w-0">
                    {showAvatar && !isMine && (
                      <span className="text-[10px] font-medium text-[color:var(--foreground)]/50 ml-1">{msg.sender.name}</span>
                    )}
                    <div
                      className={`relative rounded-2xl px-4 py-2.5 text-sm shadow-md break-words overflow-hidden transition-all hover:shadow-lg ${
                        isMine
                          ? "bg-[#38bdf8] text-[#13151A] rounded-br-sm font-medium"
                          : "bg-[color:var(--surface)] text-[color:var(--foreground)] border border-[color:var(--border)] rounded-bl-sm"
                      }`}
                    >
                      {msg.imageUrl && (
                        <div className="mb-2 max-w-xs sm:max-w-sm overflow-hidden rounded-xl bg-black/10">
                          <img src={msg.imageUrl} alt="Attachment" className="max-h-64 object-contain w-full" />
                        </div>
                      )}
                      {msg.content}
                    </div>
                    <span className={`text-[10px] text-[color:var(--foreground)]/50 ${isMine ? "text-right mr-1" : "ml-1"}`}>
                      {format(new Date(msg.createdAt), "h:mm a")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-[color:var(--border)] bg-[color:var(--surface)]/80 p-3 backdrop-blur-xl sm:p-5">
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            type="button"
            disabled={isUploading}
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
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
