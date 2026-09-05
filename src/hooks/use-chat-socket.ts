import { useEffect } from "react";
import io from "socket.io-client";

export function useChatSocket(
  userId: string | undefined,
  pathnameRef: React.MutableRefObject<string>,
  onNotification: () => void
) {
  useEffect(() => {
    if (!userId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) return;

    try {
      const socket = io(socketUrl, {
        transports: ["websocket", "polling"],
        timeout: 4000,
        reconnectionAttempts: 2,
      });

      socket.on("connect", () => {
        socket.emit("join_user_room", userId);
      });

      socket.on("new_chat_notification", (data: { requestId: string }) => {
        // Avoid incrementing if the user is currently ON the request detail page
        if (pathnameRef.current !== `/requests/${data.requestId}`) {
          onNotification();
        }
      });

      return () => {
        socket.disconnect();
      };
    } catch (err) {
      console.warn("Socket notification listener skipped:", err);
    }
  }, [userId, pathnameRef, onNotification]);
}
