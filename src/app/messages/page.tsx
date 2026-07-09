"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

type ChatPreview = {
  id: string;
  title: string;
  requesterId: string;
  requester: { id: string; name: string; image: string | null; role: string };
  assignedVolunteers: { id: string; name: string; image: string | null; role: string } | null;
  messages: { content: string; createdAt: string }[];
  updatedAt: string;
};

export default function MessagesInboxPage() {
  const { data: session } = useSession();
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
    <AppShell title="Messages" subtitle="Coordinate directly with victims or volunteers on your active requests.">
      <div className="mx-auto max-w-4xl space-y-4">
        {isLoading ? (
          <div className="glass-panel p-8 text-center text-sm text-slate-500">Loading your conversations...</div>
        ) : error ? (
          <div className="glass-panel p-8 text-center text-sm text-red-500">{error}</div>
        ) : chats.length === 0 ? (
          <div className="glass-panel flex flex-col items-center justify-center p-12 text-center">
            <div className="text-4xl">💬</div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No active conversations</h3>
            <p className="mt-2 text-sm text-slate-500">You don't have any active chats yet. Claim a request or wait for a volunteer to claim yours to start chatting.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {chats.map((chat) => {
              const isRequester = chat.requesterId === session?.user?.id;
              // If user is requester, talk to volunteer. Else, talk to requester.
              const otherPerson = isRequester 
                ? (chat.assignedVolunteers || null) // Assuming 1 volunteer per request for now
                : chat.requester;
              
              const lastMessage = chat.messages[0];

              return (
                <Link
                  key={chat.id}
                  href={`/messages/${chat.id}`}
                  className="glass-panel group flex items-center justify-between p-4 transition duration-300 hover:-translate-y-0.5 hover:border-sky-400/40"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
                      {otherPerson?.image ? (
                        <img src={otherPerson.image} alt={otherPerson.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg text-slate-400">👤</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-slate-900 dark:text-white">
                          {otherPerson ? otherPerson.name : "Waiting for volunteer..."}
                        </h3>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {otherPerson?.role || "PENDING"}
                        </span>
                      </div>
                      <p className="truncate text-xs font-medium text-sky-600 dark:text-sky-400">Request: {chat.title}</p>
                      <p className="mt-0.5 truncate text-sm text-slate-500">
                        {lastMessage ? lastMessage.content : "No messages yet. Say hi!"}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-slate-400">
                    {lastMessage ? formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true }) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
