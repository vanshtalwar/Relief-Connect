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
        assignedVolunteers: true,
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ request });
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
    if (!session || session.user.role !== "COORDINATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.$transaction([
      prisma.statusEvent.deleteMany({ where: { requestId: id } }),
      prisma.chatMessage.deleteMany({ where: { requestId: id } }),
      prisma.review.deleteMany({ where: { requestId: id } }),
      prisma.helpRequest.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE request error:", error);
    return NextResponse.json({ error: "Failed to delete request" }, { status: 500 });
  }
}