export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
  source?: string;
}

export function parseCoordinates(query: string): { lat: number; lng: number } | null {
  if (!query || typeof query !== "string") return null;
  const cleaned = query
    .replace(/lat(itude)?\s*[:=]?/gi, "")
    .replace(/lon(gitude)?|lng\s*[:=]?/gi, "")
    .trim();

  const parts = cleaned.split(/[,\s]+/).filter(Boolean);
  if (parts.length !== 2) return null;

  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);

  if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    return { lat, lng };
  }

  return null;
}

export function generateQueryVariations(rawQuery: string): string[] {
  const trimmed = rawQuery.trim();
  if (!trimmed) return [];

  const variations: string[] = [trimmed];

  // 1. Remove common filler words like "home number", "house number", "address", "flat number"
  const withoutFiller = trimmed
    .replace(/\b(home\s+number|house\s+number|flat\s+number|plot\s+number|room\s+number|address)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (withoutFiller && withoutFiller !== trimmed && withoutFiller.length >= 3) {
    variations.push(withoutFiller);
  }

  // 2. Strip leading house/flat/unit prefixes like "b-24", "c-12", "flat 10", "h.no 5"
  const withoutUnit = (withoutFiller || trimmed)
    .replace(/^(h\.?no\.?|house|flat|apt|unit|plot|room|bldg)\s*#?\s*[a-z0-9\-\/]+\s*[, ]*/gi, "")
    .replace(/^[a-z0-9]{1,4}[\-\/][a-z0-9]{1,4}\s*[, ]*/gi, "")
    .trim();
  if (withoutUnit && !variations.includes(withoutUnit) && withoutUnit.length >= 3) {
    variations.push(withoutUnit);
  }

  return variations;
}

export function parseArcGisCandidate(candidate: Record<string, any>): GeocodeResult | null {
  if (!candidate || !candidate.location || !candidate.address) return null;
  const lat = Number(candidate.location.y);
  const lng = Number(candidate.location.x);
  if (isNaN(lat) || isNaN(lng)) return null;

  return {
    displayName: candidate.address,
    lat,
    lng,
    source: "arcgis",
  };
}

export function formatPhotonDisplayName(p: Record<string, any>): string {
  const parts: string[] = [];
  if (p.name) parts.push(p.name);
  const streetPart = [p.housenumber, p.street].filter(Boolean).join(" ");
  if (streetPart && streetPart !== p.name) parts.push(streetPart);
  const area = p.locality || p.district;
  if (area && area !== p.name && area !== streetPart) parts.push(area);
  if (p.city && p.city !== p.name && p.city !== area) parts.push(p.city);
  if (p.county && p.county !== p.city && p.county !== area) parts.push(p.county);
  if (p.state && p.state !== p.city) parts.push(p.state);
  if (p.postcode) parts.push(p.postcode);
  if (p.country) parts.push(p.country);

  // Deduplicate consecutive identical segments
  const uniqueParts = parts.filter((val, idx, arr) => arr.indexOf(val) === idx);
  return uniqueParts.join(", ");
}

export function formatOpenMeteoDisplayName(item: Record<string, any>): string {
  const parts = [
    item.name,
    item.admin3,
    item.admin2,
    item.admin1,
    item.country,
  ].filter(Boolean);
  return parts.filter((v, i, a) => a.indexOf(v) === i).join(", ");
}

export function deduplicateGeocodeResults(results: GeocodeResult[]): GeocodeResult[] {
  const seenNames = new Set<string>();
  const output: GeocodeResult[] = [];

  for (const r of results) {
    if (!r.displayName || isNaN(r.lat) || isNaN(r.lng)) continue;
    const normalizedName = r.displayName.toLowerCase().replace(/[^\w\s]/g, "").trim();
    if (seenNames.has(normalizedName)) continue;

    // Also avoid near-duplicate coords (within ~50 meters)
    const isNearbyDuplicate = output.some(
      (existing) => Math.abs(existing.lat - r.lat) < 0.0005 && Math.abs(existing.lng - r.lng) < 0.0005
    );
    if (isNearbyDuplicate && seenNames.has(r.displayName.split(",")[0].toLowerCase())) continue;

    seenNames.add(normalizedName);
    output.push(r);
  }

  return output;
}
