import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Category, Urgency } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const rawText = await request.text();
    
    let body = "";
    let fromPhone = "";

    // Parse Twilio URL-encoded format or JSON
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(rawText);
      body = params.get("Body") || "";
      fromPhone = params.get("From") || "Unknown";
    } else {
      try {
        const json = JSON.parse(rawText);
        body = json.Body || json.text || "";
        fromPhone = json.From || json.phone || "Unknown";
      } catch {
        body = rawText; // Fallback to raw text
      }
    }

    if (!body) {
      return NextResponse.json({ error: "No message body found" }, { status: 400 });
    }

    // Parse format: SOS [CATEGORY] [LOCATION] - [DESCRIPTION]
    const text = body.trim();
    if (!text.toUpperCase().startsWith("SOS")) {
      // Not an SOS message
      return NextResponse.json({ error: "Message must start with SOS" }, { status: 400 });
    }

    const parts = text.split("-");
    if (parts.length < 2) {
      return NextResponse.json({ 
        error: "Invalid format. Expected: SOS [CATEGORY] [LOCATION] - [DESCRIPTION]" 
      }, { status: 400 });
    }

    const header = parts[0].trim().toUpperCase(); 
    const description = parts.slice(1).join("-").trim();

    const headerParts = header.split(" ");
    let categoryInput = headerParts.length > 1 ? headerParts[1] : "OTHER";
    
    // Map string to Category enum
    const validCategories = Object.values(Category);
    let category: Category = Category.OTHER;
    if (validCategories.includes(categoryInput as Category)) {
      category = categoryInput as Category;
    } else {
      // If the second word isn't a valid category, treat it as part of the location
      categoryInput = "OTHER";
    }

    // The rest of the header is the location address
    const locationParts = headerParts.slice(categoryInput === "OTHER" ? 1 : 2);
    const locationName = locationParts.join(" ").trim() || "Unknown Location";

    // Since this is SMS, GPS coords aren't perfect unless we geocode the address.
    // We will assign a rough coordinate within the disaster zone.
    const latitude = 37.7749 + (Math.random() - 0.5) * 0.1;
    const longitude = -122.4194 + (Math.random() - 0.5) * 0.1;

    // Look up user by phone or create a generic SMS user
    const systemUser = await prisma.user.upsert({
      where: { email: "sms-gateway@reliefconnect.app" },
      update: {},
      create: {
        name: "SMS Gateway Dispatch",
        email: "sms-gateway@reliefconnect.app",
        role: "VICTIM"
      }
    });

    const helpRequest = await prisma.helpRequest.create({
      data: {
        title: `SMS Request from ${fromPhone}`,
        description: description,
        category: category,
        urgency: Urgency.CRITICAL, // SMS SOS is automatically elevated to Critical
        status: "OPEN",
        latitude,
        longitude,
        locationName,
        isSOS: true, // Auto-pulse red on map
        requesterId: systemUser.id,
        clientUuid: crypto.randomUUID()
      }
    });

    // In a real app, we would send a Twilio SMS reply here confirming receipt.
    return NextResponse.json({ 
      success: true, 
      requestId: helpRequest.id, 
      message: "Help request created successfully and broadcasted to volunteers." 
    });
  } catch (error) {
    console.error("SMS Webhook Error:", error);
    return NextResponse.json({ error: "Failed to process SMS" }, { status: 500 });
  }
}
