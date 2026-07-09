import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vapidPublicKey } from "@/lib/web-push";

export async function GET() {
  return NextResponse.json({ publicKey: vapidPublicKey });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const body = await request.json();
  const { endpoint, keys } = body;

  if (!endpoint || !keys) {
    return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
  }

  const subscription = await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      userId: session?.user?.id || null,
      keys: keys as any,
    },
    create: {
      endpoint,
      userId: session?.user?.id || null,
      keys: keys as any,
    },
  });

  return NextResponse.json({ success: true, subscription });
}
