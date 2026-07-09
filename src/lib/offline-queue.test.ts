import { describe, expect, it } from "vitest";
import { syncOfflineActions } from "./demo-store";

describe("offline sync", () => {
  it("applies queued actions in order", () => {
    const synced = syncOfflineActions([
      {
        type: "CREATE_REQUEST",
        payload: {
          title: "Test water request",
          description: "Need water for a local building until roads reopen.",
          category: "WATER",
          urgency: "HIGH",
          latitude: 18.96,
          longitude: 72.82,
          contactName: "Test User",
          contactPhone: "9999999999",
          contactEmail: "test@example.com",
          photoUrl: "",
          clientUuid: crypto.randomUUID(),
        },
      },
    ]);

    expect(synced[0]?.type).toBe("CREATE_REQUEST");
  });
});