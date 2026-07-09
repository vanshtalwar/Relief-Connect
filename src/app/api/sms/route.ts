import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const bodyText = (formData.get("Body") as string || "").trim();
    const fromPhone = (formData.get("From") as string || "").trim();

    if (!bodyText.toUpperCase().startsWith("RC")) {
      // Respond with instructions
      return sendTwiMLResponse(
        "Invalid format. Please send requests as: RC <CATEGORY> <DETAILS> [@lat,lng] [optional phone]"
      );
    }

    // Strip "RC" from start
    let content = bodyText.slice(2).trim();

    // Parse category
    const firstSpaceIndex = content.indexOf(" ");
    let categoryStr = firstSpaceIndex === -1 ? content : content.slice(0, firstSpaceIndex);
    categoryStr = categoryStr.toUpperCase();

    const validCategories = ["MEDICAL", "RESCUE", "SUPPLIES", "SHELTER", "OTHER"];
    let category = "OTHER";
    if (validCategories.includes(categoryStr)) {
      category = categoryStr;
      content = firstSpaceIndex === -1 ? "" : content.slice(firstSpaceIndex).trim();
    }

    // Try to parse coordinates (e.g. @18.963,72.8258)
    let latitude = 18.963;
    let longitude = 72.8258;
    const geoRegex = /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/;
    const geoMatch = content.match(geoRegex);
    if (geoMatch) {
      latitude = parseFloat(geoMatch[1]);
      longitude = parseFloat(geoMatch[2]);
      content = content.replace(geoRegex, "").trim();
    }

    // Try to parse contact phone at the end
    let contactPhone = fromPhone || "+919000000003";
    const phoneRegex = /\+?[0-9]{10,15}$/;
    const phoneMatch = content.match(phoneRegex);
    if (phoneMatch) {
      contactPhone = phoneMatch[0];
      content = content.replace(phoneRegex, "").trim();
    }

    const description = content || "No additional description provided via SMS.";
    const title = `SMS: ${category} request from ${contactPhone.slice(-4)}`;

    // Find or create victim user
    let user = await prisma.user.findFirst({
      where: { phone: contactPhone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: `SMS Resident (${contactPhone.slice(-4)})`,
          email: `sms-${crypto.randomUUID()}@reliefconnect.dev`,
          role: "VICTIM",
          phone: contactPhone,
        },
      });
    }

    // Create HelpRequest in database
    const helpRequest = await prisma.helpRequest.create({
      data: {
        title,
        description,
        category,
        urgency: "HIGH",
        latitude,
        longitude,
        clientUuid: crypto.randomUUID(),
        requesterId: user.id,
        statusHistory: {
          create: {
            status: "OPEN",
            note: `Created via SMS webhook from ${contactPhone}`,
          },
        },
      },
    });

    return sendTwiMLResponse(
      `ReliefConnect: Your ${category} request has been logged successfully (ID: ${helpRequest.id.slice(0, 8)}). Help is on the way!`
    );
  } catch (error) {
    console.error("SMS parsing error:", error);
    return sendTwiMLResponse(
      "ReliefConnect: We encountered an error processing your SMS request. Please try again."
    );
  }
}

function sendTwiMLResponse(message: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${message}</Message>
</Response>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
