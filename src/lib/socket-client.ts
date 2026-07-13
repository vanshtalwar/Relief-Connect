import io from "socket.io-client";

export function broadcastRequestUpdate() {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";
  const socket = io(socketUrl);
  
  socket.on("connect", () => {
    socket.emit("broadcast_requests_update");
    setTimeout(() => socket.disconnect(), 1000);
  });
}
