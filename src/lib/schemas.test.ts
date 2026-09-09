import { describe, it, expect } from "vitest";
import { claimSchema } from "./schemas";

describe("claimSchema", () => {
  it("validates empty body for solo claim", () => {
    const result = claimSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("validates note for claim", () => {
    const result = claimSchema.safeParse({ note: "En route with first aid kit" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBe("En route with first aid kit");
    }
  });

  it("validates single volunteerId for coordinator dispatch", () => {
    const result = claimSchema.safeParse({
      volunteerId: "vol-123",
      note: "Dispatched by Coordinator",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.volunteerId).toBe("vol-123");
    }
  });

  it("validates multiple volunteerIds for batch dispatch", () => {
    const result = claimSchema.safeParse({
      volunteerIds: ["vol-1", "vol-2", "vol-3"],
      note: "Dispatched response unit",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.volunteerIds).toEqual(["vol-1", "vol-2", "vol-3"]);
    }
  });
});
