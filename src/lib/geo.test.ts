import { describe, expect, it } from "vitest";
import { buildNearbyRequestsSql, filterNearbyRequests, formatDistance, haversineDistanceKm } from "./geo";

describe("geo helpers", () => {
  it("filters nearby requests by radius and sorts by distance", () => {
    const results = filterNearbyRequests({ lat: 18.963, lng: 72.8258, radiusKm: 5 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.id).toBe("req-1");
  });

  it("formats short distances consistently", () => {
    expect(formatDistance(0.25)).toBe("250 m");
    expect(formatDistance(2.4)).toBe("2.4 km");
  });

  it("builds the PostGIS SQL preview with distance ordering", () => {
    const sql = buildNearbyRequestsSql({ lat: 18.963, lng: 72.8258, radiusKm: 10 }) as { strings: string[] };
    expect(sql.strings.join(" ")).toContain("ST_DWithin");
    expect(sql.strings.join(" ")).toContain("ST_Distance");
  });

  it("computes a positive haversine distance", () => {
    expect(haversineDistanceKm({ latitude: 18.963, longitude: 72.8258 }, { latitude: 18.9721, longitude: 72.8142 })).toBeGreaterThan(0);
  });
});