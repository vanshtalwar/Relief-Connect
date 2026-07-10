"use client";

import { useEffect, useState, useRef } from "react";
import io, { Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

type Message = {
  id: string;
  requestId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    role: string;
    image: string | null;
  };
};

export function ChatInterface({ requestId }: { requestId: string }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch historical messages
    fetch(`/api/requests/${requestId}/messages`)
      .then((res) => res.json())
      .then((data) => {
        if (data.messages) setMessages(data.messages);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });

    // Connect to Socket.IO server on port 3001
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";
    const newSocket = io(socketUrl);
    
    newSocket.on("connect", () => {
      newSocket.emit("join_request_room", requestId);
    });

    newSocket.on("receive_message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit("leave_request_room", requestId);
      newSocket.disconnect();
    };
  }, [requestId]);

  useEffect(() => {
    // Scroll to bottom on new message
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket || !session?.user?.id || isSending) return;

    setIsSending(true);
    socket.emit("send_message", {
      requestId,
      senderId: session.user.id,
      content: input.trim(),
    }, (response: any) => {
      setIsSending(false);
      if (response && response.success) {
        setInput("");
      } else {
        console.error("Failed to send message", response?.error);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-[500px] rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 items-center justify-center">
        <div className="text-sm text-slate-500">Loading chat history...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] overflow-hidden shadow-sm">
      <div className="bg-[color:var(--surface-strong)] px-5 py-4 border-b border-[color:var(--border)] flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[color:var(--foreground)]">Coordination Chat</h3>
          <p className="text-xs text-[color:var(--foreground)]/60">Live real-time messaging</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Connected
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[color:var(--surface)]" ref={scrollRef}>
        {messages.length === 0 ? (
          <p className="text-center text-sm text-slate-500 my-10">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => {
            const isMe = session?.user?.id === msg.senderId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  {!isMe && msg.sender.image && (
                    <img src={msg.sender.image} className="w-5 h-5 rounded-full object-cover" alt="" />
                  )}
                  <span className="text-xs font-medium text-slate-500">{isMe ? "You" : msg.sender.name}</span>
                  <span className="text-[10px] text-slate-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm shadow-sm ${isMe ? "bg-sky-500 text-white rounded-br-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-sm"}`}>
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t border-[color:var(--border)] bg-[color:var(--surface-strong)] flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 input rounded-full py-2.5 px-5"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className="focus-ring rounded-full bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-all hover:bg-sky-400"
        >
          {isSending ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
