import webpush from "web-push";

const globalForVapid = globalThis as typeof globalThis & {
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
};

// Check env, otherwise generate once and persist in globalForVapid
let vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  if (!globalForVapid.vapidPublicKey || !globalForVapid.vapidPrivateKey) {
    const keys = webpush.generateVAPIDKeys();
    globalForVapid.vapidPublicKey = keys.publicKey;
    globalForVapid.vapidPrivateKey = keys.privateKey;
    console.log("-----------------------------------------");
    console.log("Generated dynamic VAPID Keys for Web Push:");
    console.log("Public Key:", keys.publicKey);
    console.log("Private Key:", keys.privateKey);
    console.log("Add these to your .env file to persist them!");
    console.log("-----------------------------------------");
  }
  vapidPublicKey = globalForVapid.vapidPublicKey;
  vapidPrivateKey = globalForVapid.vapidPrivateKey;
}

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:coordinator@reliefconnect.dev",
    vapidPublicKey,
    vapidPrivateKey
  );
}

export { vapidPublicKey };

export async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  title: string,
  body: string,
  url = "/"
) {
  try {
    const payload = JSON.stringify({ title, body, url });
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      payload
    );
    return true;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return false;
  }
}

export async function broadcastPushNotification(
  subscriptions: Array<{ endpoint: string; keys: any }>,
  title: string,
  body: string,
  url = "/"
) {
  const results = await Promise.all(
    subscriptions.map((sub) =>
      sendPushNotification(
        {
          endpoint: sub.endpoint,
          keys: typeof sub.keys === "string" ? JSON.parse(sub.keys) : sub.keys,
        },
        title,
        body,
        url
      )
    )
  );
  return results.filter(Boolean).length;
}
