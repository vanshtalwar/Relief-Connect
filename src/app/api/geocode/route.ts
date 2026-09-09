import { NextResponse } from "next/server";
import {
  parseCoordinates,
  generateQueryVariations,
  parseArcGisCandidate,
  formatPhotonDisplayName,
  formatOpenMeteoDisplayName,
  deduplicateGeocodeResults,
  type GeocodeResult,
} from "@/lib/geocoding";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    // Forward geocoding (search by address/name or coordinates)
    if (query && query.trim().length > 0) {
      const rawQuery = query.trim();

      // 1. Direct coordinate match (e.g. "19.0760, 72.8777")
      const coords = parseCoordinates(rawQuery);
      if (coords) {
        const locationName = await reverseGeocodeCoord(coords.lat, coords.lng);
        return NextResponse.json({
          results: [
            {
              displayName: `${locationName} (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`,
              lat: coords.lat,
              lng: coords.lng,
              source: "coordinates",
            },
          ],
        });
      }

      const allResults: GeocodeResult[] = [];
      const queryVariations = generateQueryVariations(rawQuery);

      // 2. Primary Provider: ESRI ArcGIS World Geocoding (World-class colony/address matching)
      for (const q of queryVariations.slice(0, 2)) {
        try {
          const arcGisRes = await fetch(
            `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&SingleLine=${encodeURIComponent(q)}&maxLocations=6`,
            { signal: AbortSignal.timeout(4000) }
          );
          if (arcGisRes.ok) {
            const arcGisData = await arcGisRes.json();
            if (Array.isArray(arcGisData.candidates)) {
              for (const cand of arcGisData.candidates) {
                // Keep matches with score >= 70
                if ((cand.score ?? 100) >= 70) {
                  const parsed = parseArcGisCandidate(cand);
                  if (parsed) allResults.push(parsed);
                }
              }
            }
          }
        } catch (err) {
          console.warn("ArcGIS geocode error for query:", q, err);
        }

        // If ArcGIS found high-confidence matches, no need to query relaxed variation
        if (allResults.length > 0) break;
      }

      // 3. Secondary Provider: Photon (Komoot OSM - fast street/POI level)
      try {
        const photonRes = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(rawQuery)}&limit=7`,
          {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(3500),
          }
        );

        if (photonRes.ok) {
          const photonData = await photonRes.json();
          if (Array.isArray(photonData.features)) {
            for (const f of photonData.features) {
              if (f.geometry?.coordinates && f.properties) {
                const lng = f.geometry.coordinates[0];
                const lat = f.geometry.coordinates[1];
                const displayName = formatPhotonDisplayName(f.properties);
                if (displayName) {
                  allResults.push({ displayName, lat, lng, source: "photon" });
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn("Photon forward geocode error:", err);
      }

      // 4. Fallback if still under 3 results: Open-Meteo & Nominatim
      if (allResults.length < 3) {
        const fallbackPromises = [
          // Open-Meteo Geocoding
          (async () => {
            try {
              const targetQuery = queryVariations[queryVariations.length - 1] || rawQuery;
              const omRes = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(targetQuery)}&count=5&language=en&format=json`,
                { signal: AbortSignal.timeout(3500) }
              );
              if (omRes.ok) {
                const omData = await omRes.json();
                if (Array.isArray(omData.results)) {
                  return omData.results.map((item: any) => ({
                    displayName: formatOpenMeteoDisplayName(item),
                    lat: item.latitude,
                    lng: item.longitude,
                    source: "open-meteo",
                  }));
                }
              }
            } catch (err) {
              console.warn("Open-Meteo geocode error:", err);
            }
            return [];
          })(),

          // Nominatim OpenStreetMap
          (async () => {
            try {
              const targetQuery = queryVariations[queryVariations.length - 1] || rawQuery;
              const nomRes = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(targetQuery)}&limit=5&addressdetails=1`,
                {
                  headers: {
                    "User-Agent": "ReliefConnect/1.0 (emergency-relief-platform; contact=support@reliefconnect.org)",
                    Accept: "application/json",
                  },
                  signal: AbortSignal.timeout(4500),
                }
              );
              if (nomRes.ok) {
                const nomData = await nomRes.json();
                if (Array.isArray(nomData)) {
                  return nomData.map((item: any) => ({
                    displayName: item.display_name,
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lon),
                    source: "nominatim",
                  }));
                }
              }
            } catch (err) {
              console.warn("Nominatim forward geocode error:", err);
            }
            return [];
          })(),
        ];

        const settled = await Promise.allSettled(fallbackPromises);
        for (const res of settled) {
          if (res.status === "fulfilled" && Array.isArray(res.value)) {
            allResults.push(...res.value);
          }
        }
      }

      const deduplicated = deduplicateGeocodeResults(allResults);
      return NextResponse.json({ results: deduplicated });
    }

    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);

    const locationName = await reverseGeocodeCoord(latNum, lngNum);
    return NextResponse.json({ locationName });
  } catch (error) {
    return NextResponse.json({ error: "Geocoding request failed" }, { status: 500 });
  }
}

async function reverseGeocodeCoord(lat: number, lng: number): Promise<string> {
  const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  // 1. ESRI ArcGIS Reverse Geocoding (high address accuracy)
  try {
    const res = await fetch(
      `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=json&location=${lng},${lat}`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.address?.LongLabel) {
        return data.address.LongLabel;
      }
      if (data.address?.Match_addr) {
        return data.address.Match_addr;
      }
    }
  } catch (err) {
    console.warn("ArcGIS reverse geocode error:", err);
  }

  // 2. BigDataCloud (fast, client/server friendly, global)
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      const data = await res.json();
      const parts = [
        data.locality || data.city,
        data.principalSubdivision,
        data.countryName,
      ].filter(Boolean);
      if (parts.length > 0) {
        return parts.filter((v, i, a) => a.indexOf(v) === i).join(", ");
      }
    }
  } catch (err) {
    console.warn("BigDataCloud reverse geocode error:", err);
  }

  // 3. Photon Reverse Geocoding
  try {
    const res = await fetch(
      `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.features) && data.features[0]?.properties) {
        const formatted = formatPhotonDisplayName(data.features[0].properties);
        if (formatted) return formatted;
      }
    }
  } catch (err) {
    console.warn("Photon reverse geocode error:", err);
  }

  // 4. Nominatim Reverse Geocoding
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`,
      {
        headers: {
          "User-Agent": "ReliefConnect/1.0 (emergency-relief-platform; contact=support@reliefconnect.org)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.display_name) return data.display_name;
    }
  } catch (err) {
    console.warn("Nominatim reverse geocode error:", err);
  }

  return fallback;
}
