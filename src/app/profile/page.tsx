"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/components/i18n-provider";
import type { Language } from "@/lib/i18n/dictionaries";

const VerifiedBadge = () => (
  <div className="relative flex items-center justify-center group">
    <svg
      className="h-[18px] w-[18px] text-[#38bdf8] shrink-0 drop-shadow-sm transition-transform group-hover:scale-125 cursor-help"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2l2.35 2.1 3.12-.4 1.15 2.93 2.8.94-.8 3.05 1.5 2.76-2.02 2.45.2 3.14-3.08.6-1.57 2.72L12 22l-2.35-2.1-3.12.4-1.15-2.93-2.8-.94.8-3.05-1.5-2.76 2.02-2.45-.2-3.14 3.08-.6 1.57-2.72L12 2zm-.25 14l5.25-5.25-1.41-1.41-3.84 3.83-1.84-1.83-1.41 1.41L11.75 16z" />
    </svg>
    <div className="pointer-events-none absolute bottom-full mb-1.5 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 z-50">
      User is verified
      <div className="absolute left-1/2 top-full -translate-x-1/2 border-[4px] border-transparent border-t-slate-800"></div>
    </div>
  </div>
);

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inventory, setInventory] = useState<string>("");
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);

  const [locationConsent, setLocationConsent] = useState(false);
  const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);

  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const { data: profileData } = useSWR(session?.user?.id ? "/api/users/profile" : null, fetcher);

  useEffect(() => {
    if (profileData?.user) {
      if (profileData.user.inventory) {
        setInventory(profileData.user.inventory.join(", "));
      }
      if (typeof profileData.user.locationConsent === "boolean") {
        setLocationConsent(profileData.user.locationConsent);
      }
    }
  }, [profileData]);

  const handleInventoryUpdate = async () => {
    setIsUpdatingInventory(true);
    try {
      const items = inventory.split(",").map((i) => i.trim()).filter(Boolean);
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventory: items }),
      });
      if (res.ok) {
        alert("Inventory updated successfully!");
      } else {
        throw new Error("Update failed");
      }
    } catch {
      alert("Failed to update inventory.");
    } finally {
      setIsUpdatingInventory(false);
    }
  };

  const handleConsentToggle = async () => {
    setIsUpdatingConsent(true);
    try {
      const newConsent = !locationConsent;
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationConsent: newConsent }),
      });
      if (res.ok) {
        setLocationConsent(newConsent);
      } else {
        throw new Error("Update failed");
      }
    } catch {
      alert("Failed to update location consent.");
    } finally {
      setIsUpdatingConsent(false);
    }
  };

  const handleRoleToggle = async () => {
    setIsUpdatingRole(true);
    try {
      const newRole = session?.user?.role === "VICTIM" ? "VOLUNTEER" : "VICTIM";
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        await update(); // Refresh session
      } else {
        throw new Error("Role update failed");
      }
    } catch {
      alert("Failed to update role.");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. Upload photo to system local uploads
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload image.");
      }

      const uploadData = await uploadRes.json();
      const photoUrl = uploadData.url;

      // 2. Save user profile photo URL to PostgreSQL
      const profileRes = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photoUrl }),
      });

      if (!profileRes.ok) {
        const errorText = await profileRes.text();
        console.error("Profile update failed:", profileRes.status, errorText);
        throw new Error(`Failed to update profile photo: ${profileRes.status} ${errorText}`);
      }

      // 3. Update active session token details dynamically on client
      await update();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "An error occurred during photo upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const { language, setLanguage } = useTranslation();

  return (
    <AppShell title="Profile" subtitle="Your role, identity, and session controls in one place.">
      <section className={`grid gap-6 ${session?.user?.role === "VOLUNTEER" ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        <div className="order-2 lg:order-1 bg-[color:var(--muted)] border border-[color:var(--border)] shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Account details</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <Row
                label="Name"
                value={
                  <div className="flex items-center justify-end gap-1.5">
                    <span>{session?.user?.name ?? "Demo user"}</span>
                    {status === "authenticated" && <VerifiedBadge />}
                  </div>
                }
              />
              <Row label="Email" value={session?.user?.email ?? "victim@reliefconnect.dev"} />
              <Row label="Phone" value={session?.user?.phone ?? "Not provided"} />
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <dt className="text-[color:var(--foreground)]/70">Language</dt>
                <dd className="text-right">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="focus-ring cursor-pointer rounded-md border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--foreground)] transition-colors hover:border-[#38bdf8]/50 outline-none"
                    aria-label="Select Language"
                  >
                    <option value="en">English (EN)</option>
                    <option value="hi">Hindi (HI)</option>
                  </select>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <dt className="text-[color:var(--foreground)]/70">Role</dt>
                <dd className="text-right flex items-center gap-3">
                  <span className="font-medium text-[color:var(--foreground)]">{session?.user?.role ?? "VICTIM"}</span>
                  {session?.user?.role !== "COORDINATOR" && (
                    <button
                      onClick={handleRoleToggle}
                      disabled={isUpdatingRole}
                      className="focus-ring rounded-md bg-[#38bdf8]/10 px-3 py-1.5 text-[12px] font-semibold text-[#38bdf8] transition-colors hover:bg-[#38bdf8]/20 disabled:opacity-50 border border-[#38bdf8]/20"
                    >
                      {isUpdatingRole ? "Switching..." : `Switch to ${session?.user?.role === "VICTIM" ? "VOLUNTEER" : "VICTIM"}`}
                    </button>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {session?.user?.role === "VOLUNTEER" && (
          <div className="order-3 lg:order-2 bg-[color:var(--muted)] border border-[color:var(--border)] shadow-sm rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Resource Inventory</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--foreground)]/70">
                List the supplies and equipment you carry.
              </p>
              <div className="mt-5">
                <textarea
                  value={inventory}
                  onChange={(e) => setInventory(e.target.value)}
                  placeholder="e.g., First Aid Kit, Flashlight, 5L Water, Power Bank"
                  className="w-full min-h-[100px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-[14px] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground)]/50 focus:outline-none focus:border-[#38bdf8]/50 focus:ring-1 focus:ring-[#38bdf8]/50 transition-colors"
                />
                <button
                  onClick={handleInventoryUpdate}
                  disabled={isUpdatingInventory}
                  className="mt-4 focus-ring rounded-md bg-[#3FA37E] px-5 py-2.5 text-[13px] font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {isUpdatingInventory ? "Updating..." : "Save Inventory"}
                </button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[color:var(--border)]">
              <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Privacy & Consent</h2>
              <div className="mt-5 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="locationConsent"
                  checked={locationConsent}
                  onChange={handleConsentToggle}
                  disabled={isUpdatingConsent}
                  className="mt-1 h-4 w-4 rounded border-[color:var(--border-strong)] bg-[color:var(--surface)] text-[#38bdf8] focus:ring-[#38bdf8]/50"
                />
                <label htmlFor="locationConsent" className="text-[13px] text-[color:var(--foreground)]/70">
                  <span className="block font-medium text-[color:var(--foreground)] mb-1">Allow Background Location Tracking</span>
                  I consent to having my location tracked while I have active assigned requests.
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="order-1 lg:order-3 bg-[color:var(--muted)] border border-[color:var(--border)] shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Profile photo</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--foreground)]/70">
              Upload a profile image to represent your identity.
            </p>

            <div className="mt-8 flex flex-col items-center gap-6">
              <div className="relative h-32 w-32 overflow-hidden rounded-full border-[3px] border-[#38bdf8]/30 bg-[color:var(--surface)] shadow-lg flex items-center justify-center">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt="Profile Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-4xl text-[color:var(--foreground)]/50">👤</div>
                )}
              </div>

              <div className="w-full max-w-xs">
                <label className="block text-center text-[13px] font-semibold text-[color:var(--foreground)] cursor-pointer bg-[color:var(--surface-strong)] hover:bg-[color:var(--border)] transition-colors rounded-md border border-[color:var(--border)] px-4 py-2.5">
                  {isUploading ? "Uploading photo..." : "Upload new photo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              </div>

              {error && (
                <p className="text-[13px] text-red-500 font-medium">{error}</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
      <dt className="text-[color:var(--foreground)]/70">{label}</dt>
      <dd className="text-right font-medium text-[color:var(--foreground)]">{value}</dd>
    </div>
  );
}