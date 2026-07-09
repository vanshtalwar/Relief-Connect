import { NextResponse } from "next/server";
import { syncActionSchema, type SyncAction } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const actions = Array.isArray(body.actions) ? body.actions : [];
    const validActions: SyncAction[] = [];

    for (const action of actions) {
      const parsed = syncActionSchema.safeParse(action);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid sync payload" }, { status: 400 });
      }
      validActions.push(parsed.data);
    }

    let defaultVictimId = session?.user?.id;
    if (!defaultVictimId) {
      const victim = await prisma.user.findFirst({ where: { role: "VICTIM" } });
      defaultVictimId = victim?.id;
    }

    let defaultVolunteerId = session?.user?.id;
    if (!defaultVolunteerId) {
      const volunteer = await prisma.user.findFirst({ where: { role: "VOLUNTEER" } });
      defaultVolunteerId = volunteer?.id;
    }

    const syncedResults = [];

    for (const action of validActions) {
      try {
        if (action.type === "CREATE_REQUEST") {
          const req = await prisma.helpRequest.upsert({
            where: { clientUuid: action.payload.clientUuid },
            update: {},
            create: {
              title: action.payload.title,
              description: action.payload.description,
              category: action.payload.category,
              urgency: action.payload.urgency,
              latitude: action.payload.latitude,
              longitude: action.payload.longitude,
              photoUrl: action.payload.photoUrl || null,
              clientUuid: action.payload.clientUuid,
              requesterId: defaultVictimId ?? "no-victim-id",
              statusHistory: {
                create: {
                  status: "OPEN",
                  note: `Created for ${action.payload.contactName} (Offline Sync)`,
                },
              },
            },
          });
          syncedResults.push({ type: action.type, request: req });
        } else if (action.type === "CLAIM_REQUEST") {
          const req = await prisma.helpRequest.update({
            where: { id: action.payload.requestId },
            data: {
              status: "CLAIMED",
              assignedVolunteers: {
                connect: { id: defaultVolunteerId }
              },
              statusHistory: {
                create: {
                  status: "CLAIMED",
                  note: action.payload.note || "Volunteer claimed request offline",
                },
              },
            },
          });
          syncedResults.push({ type: action.type, request: req });
        } else if (action.type === "UPDATE_STATUS") {
          const req = await prisma.helpRequest.update({
            where: { id: action.payload.requestId },
            data: {
              status: action.payload.status,
              statusHistory: {
                create: {
                  status: action.payload.status,
                  note: action.payload.note || "Status updated offline",
                },
              },
            },
          });
          syncedResults.push({ type: action.type, request: req });
        } else if (action.type === "RESOLVE_REQUEST") {
          const req = await prisma.helpRequest.update({
            where: { id: action.payload.requestId },
            data: {
              status: "RESOLVED",
              statusHistory: {
                create: {
                  status: "RESOLVED",
                  note: "Resolved offline",
                },
              },
            },
          });
          syncedResults.push({ type: action.type, request: req });
        }
      } catch (err) {
        console.error("Failed to sync action:", action, err);
      }
    }

    return NextResponse.json({ synced: syncedResults });
  } catch (error) {
    console.error("Sync route error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}