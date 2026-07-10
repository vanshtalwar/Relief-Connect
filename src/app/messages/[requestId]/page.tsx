"use client";

import { useEffect, useState, useRef, use } from "react";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/app-shell";
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
      <AppShell title="Chat" subtitle="Connecting to secure chat room...">
        <div className="glass-panel p-8 text-center text-sm text-slate-500">Loading chat history...</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Chat Error" subtitle="Unable to load conversation.">
        <div className="glass-panel p-8 text-center text-sm text-red-500">{error}</div>
      </AppShell>
    );
  }

  // Determine who the "other" person is
  const isRequester = requestDetails?.requesterId === session?.user?.id;
  const otherPerson = isRequester 
    ? (requestDetails?.assignedVolunteers?.[0] || null)
    : requestDetails?.requester;

  return (
    <AppShell title="Live Chat" subtitle="Communicate directly to coordinate relief efforts.">
      <div className="mx-auto flex h-[calc(100vh-14rem)] max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white/50 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/50">
        
        {/* Left Sidebar (Details) */}
        <div className="hidden md:flex w-80 shrink-0 flex-col gap-6 border-r border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/20 overflow-y-auto">
          
          <Link href="/messages" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-600 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Messages
          </Link>

          {/* Other Person Details */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Chatting With</h3>
            {otherPerson ? (
              <div className="flex items-center gap-3">
                <Link href={`/profile/${otherPerson.id}`} className="block h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 transition hover:border-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-sky-500">
                  {otherPerson.image ? (
                    <img src={otherPerson.image} alt={otherPerson.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg text-slate-400">👤</div>
                  )}
                </Link>
                <div>
                  <Link href={`/profile/${otherPerson.id}`} className="font-semibold text-slate-900 transition hover:text-sky-600 dark:text-white dark:hover:text-sky-400">
                    {otherPerson.name}
                  </Link>
                  <div className="text-xs font-medium text-sky-600 dark:text-sky-400">{otherPerson.role}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic">Waiting for volunteer...</div>
            )}
          </div>

          <div className="h-px w-full bg-slate-200 dark:bg-slate-800"></div>

          {/* Request Details */}
          {requestDetails && (
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Request Information</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-500">Title</div>
                  <div className="font-medium text-slate-900 dark:text-white">{requestDetails.title}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Category</div>
                  <div className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {requestDetails.category}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Urgency</div>
                  <div className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                    requestDetails.urgency === "CRITICAL" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                    requestDetails.urgency === "HIGH" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}>
                    {requestDetails.urgency}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Status</div>
                  <div className="font-medium text-slate-900 dark:text-white">{requestDetails.status}</div>
                </div>
                
                <Link 
                  href={`/requests/${requestDetails.id}`}
                  className="mt-4 block w-full rounded-xl border border-slate-200 bg-white py-2 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  View Full Request
                </Link>
              </div>
            </div>
          )}

        </div>

        {/* Right: Chat Area */}
        <div className="flex flex-1 flex-col min-w-0">
          
          {/* Mobile Header (Shows info when sidebar is hidden) */}
          <div className="md:hidden border-b border-slate-200 dark:border-slate-800 p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex items-center gap-3">
             <Link href="/messages" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
               <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
               </svg>
             </Link>
             <Link href={`/profile/${otherPerson?.id}`} className="block h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100 transition hover:ring-2 hover:ring-sky-400 dark:bg-slate-800">
                {otherPerson?.image ? (
                  <img src={otherPerson.image} alt={otherPerson.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">👤</div>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/profile/${otherPerson?.id}`} className="block truncate font-semibold text-sm text-slate-900 transition hover:text-sky-600 dark:text-white dark:hover:text-sky-400">
                  {otherPerson ? otherPerson.name : "Waiting for volunteer..."}
                </Link>
                <div className="truncate text-xs text-slate-500">{requestDetails?.title}</div>
              </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                <span className="text-4xl">👋</span>
                <p className="mt-2 text-sm font-medium">Say hello! Be the first to start the conversation.</p>
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
                        <div className="shrink-0 h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shadow-sm hidden sm:block">
                          {showAvatar && (
                            msg.sender.image ? (
                              <img src={msg.sender.image} alt={msg.sender.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs">👤</div>
                            )
                          )}
                        </div>
                      )}

                      {/* Bubble */}
                      <div className="flex flex-col gap-1 min-w-0">
                        {showAvatar && !isMine && (
                          <span className="text-[10px] font-medium text-slate-500 ml-1">{msg.sender.name}</span>
                        )}
                        <div
                          className={`relative rounded-2xl px-4 py-2.5 text-sm shadow-sm break-words overflow-hidden ${
                            isMine
                              ? "bg-sky-500 text-white rounded-br-sm"
                              : "bg-white text-slate-900 border border-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 rounded-bl-sm"
                          }`}
                        >
                          {msg.imageUrl && (
                            <div className="mb-2 max-w-xs sm:max-w-sm overflow-hidden rounded-xl bg-black/10">
                              <img src={msg.imageUrl} alt="Attachment" className="max-h-64 object-contain w-full" />
                            </div>
                          )}
                          {msg.content}
                        </div>
                        <span className={`text-[10px] text-slate-400 ${isMine ? "text-right mr-1" : "ml-1"}`}>
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
          <div className="border-t border-slate-200 bg-white/80 p-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-4">
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
                className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 disabled:opacity-50"
                title="Attach photo"
              >
                {isUploading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent"></div>
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
                  className="focus-ring w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() && !isUploading}
                  className="focus-ring flex shrink-0 items-center justify-center rounded-full bg-sky-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-400 disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
