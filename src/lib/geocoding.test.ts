import { describe, it, expect } from "vitest";
import {
  parseCoordinates,
  formatPhotonDisplayName,
  formatOpenMeteoDisplayName,
  deduplicateGeocodeResults,
  generateQueryVariations,
  parseArcGisCandidate,
} from "./geocoding";

describe("geocoding helpers", () => {
  describe("parseCoordinates", () => {
    it("should parse comma-separated lat/lng", () => {
      const parsed = parseCoordinates("19.0760, 72.8777");
      expect(parsed).not.toBeNull();
      expect(parsed?.lat).toBeCloseTo(19.076);
      expect(parsed?.lng).toBeCloseTo(72.8777);
    });

    it("should parse space-separated lat/lng", () => {
      const parsed = parseCoordinates("28.6139 77.2090");
      expect(parsed).not.toBeNull();
      expect(parsed?.lat).toBeCloseTo(28.6139);
      expect(parsed?.lng).toBeCloseTo(77.209);
    });

    it("should parse lat/lng with prefixes", () => {
      const parsed = parseCoordinates("lat: 19.0760, lng: 72.8777");
      expect(parsed).not.toBeNull();
      expect(parsed?.lat).toBeCloseTo(19.076);
      expect(parsed?.lng).toBeCloseTo(72.8777);
    });

    it("should return null for non-coordinate text", () => {
      expect(parseCoordinates("Bandra West, Mumbai")).toBeNull();
      expect(parseCoordinates("123 Main Street")).toBeNull();
      expect(parseCoordinates("")).toBeNull();
    });

    it("should return null for out-of-range coordinates", () => {
      expect(parseCoordinates("95.0, 72.0")).toBeNull(); // Lat > 90
      expect(parseCoordinates("19.0, 195.0")).toBeNull(); // Lng > 180
    });
  });

  describe("generateQueryVariations", () => {
    it("cleans home number and address filler words", () => {
      const variations = generateQueryVariations("house number 12 dilshad colony delhi address home number");
      expect(variations[0]).toBe("house number 12 dilshad colony delhi address home number");
      expect(variations).toContain("12 dilshad colony delhi");
      expect(variations.some(v => v.includes("dilshad colony delhi"))).toBe(true);
    });

    it("strips unit prefix like b-24", () => {
      const variations = generateQueryVariations("b-24 dilshad colony delhi");
      expect(variations[0]).toBe("b-24 dilshad colony delhi");
      expect(variations).toContain("dilshad colony delhi");
    });
  });

  describe("parseArcGisCandidate", () => {
    it("parses candidate location and address", () => {
      const parsed = parseArcGisCandidate({
        address: "Dilshad Colony, Dilshad Garden, Shahadara, Delhi",
        location: { x: 77.3291, y: 28.6835 },
      });
      expect(parsed).not.toBeNull();
      expect(parsed?.displayName).toBe("Dilshad Colony, Dilshad Garden, Shahadara, Delhi");
      expect(parsed?.lat).toBeCloseTo(28.6835);
      expect(parsed?.lng).toBeCloseTo(77.3291);
      expect(parsed?.source).toBe("arcgis");
    });
  });

  describe("formatPhotonDisplayName", () => {
    it("formats address with hospital, street, district, and city", () => {
      const formatted = formatPhotonDisplayName({
        name: "Lilavati Hospital",
        street: "KC Marg",
        locality: "Bandra West",
        city: "Mumbai",
        state: "Maharashtra",
        postcode: "400050",
        country: "India",
      });
      expect(formatted).toContain("Lilavati Hospital");
      expect(formatted).toContain("KC Marg");
      expect(formatted).toContain("Bandra West");
      expect(formatted).toContain("Mumbai");
      expect(formatted).toContain("India");
    });
  });

  describe("formatOpenMeteoDisplayName", () => {
    it("formats administrative areas properly", () => {
      const formatted = formatOpenMeteoDisplayName({
        name: "Connaught Place",
        admin2: "New Delhi",
        admin1: "Delhi",
        country: "India",
      });
      expect(formatted).toBe("Connaught Place, New Delhi, Delhi, India");
    });
  });

  describe("deduplicateGeocodeResults", () => {
    it("removes duplicate names and nearby duplicates", () => {
      const results = deduplicateGeocodeResults([
        { displayName: "Bandra, Mumbai", lat: 19.0549, lng: 72.8402 },
        { displayName: "Bandra, Mumbai", lat: 19.0549, lng: 72.8402 },
        { displayName: "Bandra Station, Mumbai", lat: 19.055, lng: 72.8403 },
        { displayName: "Connaught Place, Delhi", lat: 28.6318, lng: 77.2194 },
      ]);
      expect(results.length).toBeLessThanOrEqual(3);
      expect(results.some((r) => r.displayName.includes("Connaught Place"))).toBe(true);
    });
  });
});
