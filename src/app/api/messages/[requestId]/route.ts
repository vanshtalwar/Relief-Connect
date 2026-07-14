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
    
    if (!isRequester && !isVolunteer) {
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
    
    if (!isRequester && !isVolunteer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Determine receiver for notification logic (basic 1-to-1 assumption for now)
    const receiverId = isRequester 
      ? (helpRequest.assignedVolunteers?.id) // Send to volunteer
      : helpRequest.requesterId; // Send to requester

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

    // We rely on the client to emit Socket.IO events for real-time delivery, 
    // or we can hit our own socket server internally if we expose a REST webhook on it.
    // For simplicity, we just save to DB and let the client emit the 'send_message' socket event.

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
