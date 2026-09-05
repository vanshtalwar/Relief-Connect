import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);
    const fallbackName = `${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "ReliefConnect/1.0 (emergency-relief-platform)",
            Accept: "application/json",
          },
          // 3 second timeout for geocoding
          signal: AbortSignal.timeout(3000),
        }
      );

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          locationName: data.display_name || fallbackName,
        });
      }
    } catch (fetchErr) {
      console.warn("Nominatim reverse geocode error:", fetchErr);
    }

    return NextResponse.json({ locationName: fallbackName });
  } catch (error) {
    return NextResponse.json({ error: "Geocoding request failed" }, { status: 500 });
  }
}
