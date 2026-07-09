import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requestSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
    })
  : null;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const categoryFilter = url.searchParams.get("category");
    const dateFilter = url.searchParams.get("date");
    const statusFilter = url.searchParams.get("status");

    const requests = await prisma.helpRequest.findMany({
      where: {
        ...(categoryFilter ? { category: categoryFilter as any } : {}),
        ...(statusFilter ? { status: statusFilter as any } : {}),
        ...(dateFilter ? {
          createdAt: {
            gte: new Date(`${dateFilter}T00:00:00.000Z`),
            lt: new Date(`${dateFilter}T23:59:59.999Z`),
          }
        } : {}),
      },
      include: {
        statusHistory: {
          orderBy: { changedAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("GET requests error:", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (ratelimit) {
      const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
      const { success } = await ratelimit.limit(`requests_post_${ip}`);
      if (!success) {
        return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
      }
    }

    const session = await getServerSession(authOptions);
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    let requesterId = session?.user?.id;
    if (!requesterId) {
      const victim = await prisma.user.findFirst({ where: { role: "VICTIM" } });
      requesterId = victim?.id;
    }

    if (!requesterId) {
      return NextResponse.json({ error: "No victim user found in database to assign as requester" }, { status: 400 });
    }

    const created = await prisma.helpRequest.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        urgency: parsed.data.urgency,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        locationName: parsed.data.locationName || null,
        photoUrl: parsed.data.photoUrl || null,
        isSOS: parsed.data.isSOS || false,
        clientUuid: parsed.data.clientUuid,
        requesterId,
        statusHistory: {
          create: {
            status: "OPEN",
            note: `Created for ${parsed.data.contactName}`,
          },
        },
      },
      include: {
        statusHistory: true,
      },
    });

    // Create system notification for requester
    await prisma.notification.create({
      data: {
        userId: requesterId,
        message: `Request "${created.title}" is now pending volunteer review.`,
      },
    });

    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    console.error("POST requests error:", error);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}