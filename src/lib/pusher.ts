import Pusher from "pusher";

const hasPusherCredentials = Boolean(
  process.env.PUSHER_APP_ID &&
    process.env.PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.PUSHER_CLUSTER,
);

// Serverless Next.js route handlers should publish to Pusher instead of holding
// long-lived Socket.io connections, which do not fit the Vercel execution model.
export const serverPusher = hasPusherCredentials
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID ?? "",
      key: process.env.PUSHER_KEY ?? "",
      secret: process.env.PUSHER_SECRET ?? "",
      cluster: process.env.PUSHER_CLUSTER ?? "",
      useTLS: true,
    })
  : null;

export async function triggerPusher(channel: string, event: string, payload: Record<string, unknown>) {
  if (!serverPusher) {
    return false;
  }

  await serverPusher.trigger(channel, event, payload);
  return true;
}