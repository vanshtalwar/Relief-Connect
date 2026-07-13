import { useEffect } from "react";
import io from "socket.io-client";

export function useChatSocket(
  userId: string | undefined,
  pathnameRef: React.MutableRefObject<string>,
  onNotification: () => void
) {
  useEffect(() => {
    if (!userId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";
    const socket = io(socketUrl);

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
  }, [userId, pathnameRef, onNotification]);
}
