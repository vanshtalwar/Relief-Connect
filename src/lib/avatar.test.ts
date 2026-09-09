import { describe, expect, it } from "vitest";
import { getAvatarUrl } from "./avatar";

describe("getAvatarUrl", () => {
  it("returns null for empty or null inputs", () => {
    expect(getAvatarUrl(null)).toBeNull();
    expect(getAvatarUrl(undefined)).toBeNull();
    expect(getAvatarUrl("")).toBeNull();
  });

  it("preserves relative image paths", () => {
    expect(getAvatarUrl("/uploads/photo-123.jpg")).toBe("/uploads/photo-123.jpg");
    expect(getAvatarUrl("/api/avatar?url=test")).toBe("/api/avatar?url=test");
  });

  it("proxies Google user content URLs through /api/avatar", () => {
    const googleUrl = "https://lh3.googleusercontent.com/a/ACg8ocLDmEyi6bXSfekEFfUzTjSEAqOoUphB59pVAovZIF2AznQmBeI=s96-c";
    const proxied = getAvatarUrl(googleUrl);
    expect(proxied).toBe(`/api/avatar?url=${encodeURIComponent(googleUrl)}`);
  });

  it("proxies GitHub avatar URLs through /api/avatar", () => {
    const githubUrl = "https://avatars.githubusercontent.com/u/123456?v=4";
    const proxied = getAvatarUrl(githubUrl);
    expect(proxied).toBe(`/api/avatar?url=${encodeURIComponent(githubUrl)}`);
  });
});
