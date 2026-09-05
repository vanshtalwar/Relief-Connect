import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const messageSchema = z.object({
  content: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
}).refine(data => data.content || data.imageUrl, {
  message: "Either content or imageUrl must be provided",
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch request details and verify user has access
    const requestDetails = await prisma.helpRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: { select: { id: true, name: true, image: true, role: true } },
        assignedVolunteers: { select: { id: true, name: true, image: true, role: true } }
      }
    });

    if (!requestDetails) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const isRequester = requestDetails.requesterId === userId;
    const isVolunteer = requestDetails.assignedVolunteers?.id === userId;
    const isCoordinator = session.user.role === "COORDINATOR";
    
    if (!isRequester && !isVolunteer && !isCoordinator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch messages
    const messages = await prisma.chatMessage.findMany({
      where: { requestId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, name: true, image: true, role: true }
        }
      }
    });

    return NextResponse.json({ request: requestDetails, messages });
  } catch (error) {
    console.error("Fetch messages error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const parsed = messageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Verify access
    const helpRequest = await prisma.helpRequest.findUnique({
      where: { id: requestId },
      include: { assignedVolunteers: true }
    });

    if (!helpRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const isRequester = helpRequest.requesterId === userId;
    const isVolunteer = helpRequest.assignedVolunteers?.id === userId;
    const isCoordinator = session.user.role === "COORDINATOR";
    
    if (!isRequester && !isVolunteer && !isCoordinator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Determine receiver for notification logic
    const receiverId = isRequester 
      ? helpRequest.assignedVolunteers?.id 
      : helpRequest.requesterId;

    // Save message
    const newMessage = await prisma.chatMessage.create({
      data: {
        requestId,
        senderId: userId,
        content: parsed.data.content || null,
        imageUrl: parsed.data.imageUrl || null,
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true, role: true }
        }
      }
    });

    if (receiverId) {
      await prisma.notification.create({
        data: {
          userId: receiverId,
          message: `New message on "${helpRequest.title}": ${parsed.data.content ? parsed.data.content.substring(0, 60) : "Photo attachment"}`,
        }
      }).catch(err => console.error("Notification error:", err));
    }

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { messageId, content } = body;

    if (!messageId || !content?.trim()) {
      return NextResponse.json({ error: "Missing messageId or content" }, { status: 400 });
    }

    const existing = await prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!existing || existing.requestId !== requestId) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (existing.senderId !== session.user.id && session.user.role !== "COORDINATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        isEdited: true,
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true, role: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Edit message error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");

    if (!messageId) {
      return NextResponse.json({ error: "Missing messageId" }, { status: 400 });
    }

    const existing = await prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!existing || existing.requestId !== requestId) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (existing.senderId !== session.user.id && session.user.role !== "COORDINATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        content: null,
        imageUrl: null,
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true, role: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Delete message error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
