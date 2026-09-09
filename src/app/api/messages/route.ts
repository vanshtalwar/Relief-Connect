import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const isCoordinator = session.user.role === "COORDINATOR";

    let claimedRequestIds: string[] = [];
    try {
      if ("requestClaim" in prisma && typeof (prisma as any).requestClaim?.findMany === "function") {
        const claims = await (prisma as any).requestClaim.findMany({
          where: { volunteerId: userId },
          select: { requestId: true },
        });
        claimedRequestIds = claims.map((c: any) => c.requestId);
      }
    } catch (err) {
      console.warn("Could not query requestClaim:", err);
    }

    const orConditions: any[] = [
      { requesterId: userId },
      { volunteerId: userId },
    ];

    if (claimedRequestIds.length > 0) {
      orConditions.push({ id: { in: claimedRequestIds } });
    }

    const hasClaimsRelation = "requestClaim" in prisma;
    let activeChats: any[] = [];

    try {
      activeChats = await prisma.helpRequest.findMany({
        where: isCoordinator
          ? {}
          : {
              OR: orConditions,
            },
        include: {
          requester: {
            select: { id: true, name: true, image: true, role: true }
          },
          assignedVolunteers: {
            select: { id: true, name: true, image: true, role: true }
          },
          ...(hasClaimsRelation ? {
            claims: {
              include: {
                volunteer: {
                  select: { id: true, name: true, image: true, role: true }
                }
              },
              orderBy: { createdAt: "asc" }
            }
          } : {}),
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              content: true,
              imageUrl: true,
              createdAt: true,
              senderId: true,
            }
          }
        },
        orderBy: {
          updatedAt: "desc",
        }
      });
    } catch (queryErr) {
      console.warn("Retrying inbox fetch without claims include:", queryErr);
      activeChats = await prisma.helpRequest.findMany({
        where: isCoordinator
          ? {}
          : {
              OR: [
                { requesterId: userId },
                { volunteerId: userId },
              ],
            },
        include: {
          requester: {
            select: { id: true, name: true, image: true, role: true }
          },
          assignedVolunteers: {
            select: { id: true, name: true, image: true, role: true }
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              content: true,
              imageUrl: true,
              createdAt: true,
              senderId: true,
            }
          }
        },
        orderBy: {
          updatedAt: "desc",
        }
      });
    }

    return NextResponse.json(activeChats);
  } catch (error) {
    console.error("Fetch inbox error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
