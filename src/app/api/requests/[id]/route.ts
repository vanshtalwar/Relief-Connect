import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestSchema } from "@/lib/schemas";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const request = await prisma.helpRequest.findUnique({
      where: { id },
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
            backgroundCheck: true,
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
                backgroundCheck: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        requester: {
          select: { id: true, name: true, image: true, role: true },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const allResponders = [
      ...(request.assignedVolunteers ? [request.assignedVolunteers] : []),
      ...(request.claims ? request.claims.map((c) => c.volunteer) : []),
    ].filter((v, i, self) => i === self.findIndex((t) => t.id === v.id));

    return NextResponse.json({
      request: {
        ...request,
        responders: allResponders,
        volunteer: request.assignedVolunteers || (allResponders[0] ?? null),
      },
    });
  } catch (error) {
    console.error("GET request details error:", error);
    return NextResponse.json({ error: "Failed to fetch request details" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = requestSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.helpRequest.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    console.error("PATCH request error:", error);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.helpRequest.findUnique({
      where: { id },
      select: { requesterId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const isCoordinator = session.user.role === "COORDINATOR";
    const isOwner = existing.requesterId === session.user.id;

    if (!isCoordinator && !isOwner) {
      return NextResponse.json({ error: "Forbidden: You can only delete your own requests" }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.requestClaim.deleteMany({ where: { requestId: id } }),
      prisma.statusEvent.deleteMany({ where: { requestId: id } }),
      prisma.chatMessage.deleteMany({ where: { requestId: id } }),
      prisma.review.deleteMany({ where: { requestId: id } }),
      prisma.helpRequest.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE request error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete request" }, { status: 500 });
  }
}