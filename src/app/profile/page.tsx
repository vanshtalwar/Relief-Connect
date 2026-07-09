"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useSession } from "next-auth/react";

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [inventory, setInventory] = useState<string>("");
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);

  const [locationConsent, setLocationConsent] = useState(false);
  const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);

  useEffect(() => {
    fetch("/api/users/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.inventory) {
          setInventory(data.user.inventory.join(", "));
        }
        if (typeof data.user?.locationConsent === "boolean") {
          setLocationConsent(data.user.locationConsent);
        }
      })
      .catch((err) => console.error("Failed to load profile:", err));
  }, []);

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

  return (
    <AppShell title="Profile" subtitle="Your role, identity, and session controls in one place.">
      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="glass-panel rounded-3xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Account details</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <Row label="Status" value={status === "loading" ? "Loading..." : status} />
              <Row label="Name" value={session?.user?.name ?? "Demo user"} />
              <Row label="Email" value={session?.user?.email ?? "victim@reliefconnect.dev"} />
              <Row label="Phone" value={session?.user?.phone ?? "Not provided"} />
              <Row label="Role" value={session?.user?.role ?? "VICTIM"} />
              <Row label="Session user id" value={session?.user?.id ?? "demo-user"} />
            </dl>
          </div>
        </div>

        {session?.user?.role === "VOLUNTEER" && (
          <div className="glass-panel rounded-3xl p-5 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Resource Inventory</h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                List the supplies and equipment you carry (comma separated). This helps coordinators assign you to relevant tasks.
              </p>
              <div className="mt-4">
                <textarea
                  value={inventory}
                  onChange={(e) => setInventory(e.target.value)}
                  placeholder="e.g., First Aid Kit, Flashlight, 5L Water, Power Bank"
                  className="input min-h-[100px]"
                />
                <button
                  onClick={handleInventoryUpdate}
                  disabled={isUpdatingInventory}
                  className="mt-3 focus-ring rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 hover:bg-emerald-400 transition"
                >
                  {isUpdatingInventory ? "Updating..." : "Save Inventory"}
                </button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Privacy & Consent</h2>
              <div className="mt-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="locationConsent"
                  checked={locationConsent}
                  onChange={handleConsentToggle}
                  disabled={isUpdatingConsent}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <label htmlFor="locationConsent" className="text-sm text-slate-600 dark:text-slate-400">
                  <span className="block font-medium text-slate-900 dark:text-slate-300">Allow Background Location Tracking</span>
                  I consent to having my location tracked while I have active assigned requests. My location data is used exclusively to update the victim on my proximity, and will automatically cease tracking when all my requests are resolved.
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="glass-panel rounded-3xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Profile photo</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Upload a profile image to represent your identity.
            </p>
            
            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-sky-400/20 bg-slate-900/10 shadow-xl flex items-center justify-center">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt="Profile Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-4xl text-slate-400">👤</div>
                )}
              </div>

              <div className="w-full max-w-xs">
                <label className="block text-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 cursor-pointer bg-[color:var(--surface)] hover:bg-[color:var(--surface-strong)] transition rounded-full border border-[color:var(--border)] px-4 py-2">
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
                <p className="text-xs text-red-500 font-medium">{error}</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}