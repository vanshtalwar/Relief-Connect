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

    const isValidDate = dateFilter && !isNaN(Date.parse(dateFilter));
    const requests = await prisma.helpRequest.findMany({
      where: {
        ...(categoryFilter ? { category: categoryFilter as any } : {}),
        ...(statusFilter ? { status: statusFilter as any } : {}),
        ...(isValidDate ? {
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
        assignedVolunteers: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            latitude: true,
            longitude: true,
            isVerified: true,
          },
        },
        claims: {
          include: {
            volunteer: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
                latitude: true,
                longitude: true,
                isVerified: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      take: 500, // Limit maximum records fetched to prevent payload explosion
      orderBy: { updatedAt: "desc" },
    });

    const formattedRequests = requests.map((req) => {
      const allResponders = [
        ...(req.assignedVolunteers ? [req.assignedVolunteers] : []),
        ...(req.claims ? req.claims.map((c) => c.volunteer) : []),
      ].filter((v, i, self) => i === self.findIndex((t) => t.id === v.id));

      return {
        ...req,
        volunteer: req.assignedVolunteers || (allResponders[0] ?? null),
        responders: allResponders,
      };
    });
    
    // Add caching headers for performance
    return NextResponse.json(
      { requests: formattedRequests },
      {
        headers: {
          "Cache-Control": "s-maxage=5, stale-while-revalidate=30", // Cache for 5s, serve stale while revalidating
        },
      }
    );
  } catch (error) {
    console.error("GET requests error:", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();

    // Exempt emergency SOS distress signals from rate limits; gracefully catch rate limit network errors
    if (ratelimit && !body?.isSOS) {
      try {
        const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
        const { success } = await ratelimit.limit(`requests_post_${ip}`);
        if (!success) {
          return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
        }
      } catch (rateLimitErr) {
        console.warn("Ratelimit check skipped due to connection issue:", rateLimitErr);
      }
    }

    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      const flattened = parsed.error.flatten();
      const firstError = flattened.formErrors[0] || Object.values(flattened.fieldErrors).flat()[0] || "Invalid request data";
      return NextResponse.json({ error: firstError, details: flattened }, { status: 400 });
    }

    let requesterId = session?.user?.id;
    if (requesterId) {
      // Validate that session user ID actually exists in database to prevent foreign key errors
      const userExists = await prisma.user.findUnique({
        where: { id: requesterId },
        select: { id: true },
      });
      if (!userExists) {
        requesterId = undefined;
      }
    }

    if (!requesterId) {
      if (parsed.data.contactEmail) {
        const existing = await prisma.user.findUnique({
          where: { email: parsed.data.contactEmail.toLowerCase() },
        });
        if (existing) {
          requesterId = existing.id;
        }
      }

      if (!requesterId) {
        const victim = await prisma.user.findFirst({ where: { role: "VICTIM" } });
        requesterId = victim?.id;
      }

      if (!requesterId) {
        const email =
          parsed.data.contactEmail?.toLowerCase() ||
          `guest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@reliefconnect.dev`;
        const newUser = await prisma.user.create({
          data: {
            name: parsed.data.contactName || "Community Member",
            email,
            phone: parsed.data.contactPhone || null,
            role: "VICTIM",
          },
        });
        requesterId = newUser.id;
      }
    }

    // 1. Check clientUuid idempotency: if request with clientUuid already exists, return it
    if (parsed.data.clientUuid) {
      const existingReq = await prisma.helpRequest.findUnique({
        where: { clientUuid: parsed.data.clientUuid },
        include: { statusHistory: true },
      });
      if (existingReq) {
        console.log(`[POST /api/requests] Idempotent hit for clientUuid ${parsed.data.clientUuid}. Returning existing request ${existingReq.id}`);
        return NextResponse.json({ request: existingReq }, { status: 200 });
      }
    }

    // 2. Near-duplicate deduplication: prevent accidental rapid double-submissions from the same user
    const recentDuplicate = await prisma.helpRequest.findFirst({
      where: {
        requesterId,
        title: parsed.data.title.trim(),
        category: parsed.data.category,
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000), // Within 60 seconds
        },
      },
      include: {
        statusHistory: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentDuplicate) {
      const latDiff = Math.abs(recentDuplicate.latitude - parsed.data.latitude);
      const lngDiff = Math.abs(recentDuplicate.longitude - parsed.data.longitude);
      const isSameLocation = latDiff < 0.005 && lngDiff < 0.005;
      const isSameDesc = recentDuplicate.description.trim().toLowerCase() === parsed.data.description.trim().toLowerCase();

      if (isSameLocation || isSameDesc) {
        console.warn(`[POST /api/requests] Duplicate submission detected for requester ${requesterId} within 60s window. Returning existing request ${recentDuplicate.id}`);
        return NextResponse.json({ request: recentDuplicate }, { status: 200 });
      }
    }

    const clientUuid = parsed.data.clientUuid || crypto.randomUUID();

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
        clientUuid,
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
    }).catch(err => console.error("Notification create error:", err));

    // For SOS distress signals, also generate an active Alert record
    if (created.isSOS) {
      await prisma.alert.create({
        data: {
          message: `🚨 CRITICAL SOS PANIC: Immediate rescue needed near ${created.locationName || "reported coordinates"}!`,
          latitude: created.latitude,
          longitude: created.longitude,
          radiusKm: 25,
          createdBy: requesterId,
        },
      }).catch(err => console.error("SOS Alert create error:", err));
    }

    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST requests error:", error);
    const message = error?.message || "Failed to create request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}