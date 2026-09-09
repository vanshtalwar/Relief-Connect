"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import "leaflet/dist/leaflet.css";
import { haversineDistanceKm, formatDistance } from "@/lib/geo";
import { useSession } from "next-auth/react";
import useSWR from "swr";

type LeafletComponentProps = Record<string, unknown>;

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer as unknown as ComponentType<LeafletComponentProps>),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer as unknown as ComponentType<LeafletComponentProps>),
  { ssr: false },
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker as unknown as ComponentType<LeafletComponentProps>),
  { ssr: false },
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup as unknown as ComponentType<LeafletComponentProps>),
  { ssr: false },
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline as unknown as ComponentType<LeafletComponentProps>),
  { ssr: false },
);
const LayerGroup = dynamic(
  () => import("react-leaflet").then((mod) => mod.LayerGroup as unknown as ComponentType<LeafletComponentProps>),
  { ssr: false },
);

const customIcon = typeof window !== "undefined" ? require("leaflet").icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
}) : null;

const volunteerIcon = typeof window !== "undefined" ? require("leaflet").icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
}) : null;

function MapBoundsUpdater({
  victimLat,
  victimLng,
  responders,
}: {
  victimLat: number;
  victimLng: number;
  responders: Responder[];
}) {
  const map = require("react-leaflet").useMap();
  useEffect(() => {
    if (typeof window !== "undefined" && window.L) {
      const bounds = window.L.latLngBounds([[victimLat, victimLng]]);
      responders.forEach((r) => {
        if (r.latitude != null && r.longitude != null) {
          bounds.extend([r.latitude, r.longitude]);
        }
      });
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
    }
  }, [victimLat, victimLng, responders, map]);
  return null;
}

export type Responder = {
  id: string;
  name: string;
  image?: string | null;
  role?: string;
  latitude: number | null;
  longitude: number | null;
  isVerified?: boolean;
};

export function RequestDetailMap({
  requestId,
  victimLat,
  victimLng,
  locationName,
  initialVolunteer,
  responders: initialResponders,
}: {
  requestId: string;
  victimLat: number;
  victimLng: number;
  locationName?: string | null;
  initialVolunteer?: { id: string; name: string; latitude: number | null; longitude: number | null } | null;
  responders?: Responder[];
}) {
  const { data: session } = useSession();
  const [responders, setResponders] = useState<Responder[]>(() => {
    if (initialResponders && initialResponders.length > 0) {
      return initialResponders;
    }
    if (initialVolunteer) {
      return [initialVolunteer as Responder];
    }
    return [];
  });

  const currentUserId = (session?.user as any)?.id;
  const isCurrentUserResponder = Boolean(
    currentUserId && (
      responders.some((r) => r.id === currentUserId) ||
      session?.user?.role === "VOLUNTEER"
    )
  );

  // Volunteer location tracking uploads
  useEffect(() => {
    if (!isCurrentUserResponder || !("geolocation" in navigator)) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Instantly update local state for zero-latency UI updates as the volunteer walks
        setResponders((prev) => {
          const exists = prev.some((r) => r.id === currentUserId);
          if (exists) {
            return prev.map((r) => (r.id === currentUserId ? { ...r, latitude, longitude } : r));
          }
          if (currentUserId) {
            return [
              ...prev,
              {
                id: currentUserId,
                name: (session?.user as any)?.name || "You",
                role: (session?.user as any)?.role || "VOLUNTEER",
                image: (session?.user as any)?.image,
                latitude,
                longitude,
              },
            ];
          }
          return prev;
        });

        try {
          await fetch("/api/users/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude, longitude }),
          });
        } catch (err) {
          console.error("Location upload failed:", err);
        }
      },
      (err) => console.log("Watch position error:", err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isCurrentUserResponder, currentUserId, session]);

  // Request details polling with SWR
  const { data: requestData } = useSWR(
    `/api/requests/${requestId}`,
    (url) => fetch(url).then((res) => res.json()),
    { refreshInterval: 4000 }
  );

  useEffect(() => {
    if (!requestData?.request) return;
    const req = requestData.request;
    const serverResponders: Responder[] = (req.responders || [
      ...(req.assignedVolunteers ? [req.assignedVolunteers] : []),
      ...(req.claims ? req.claims.map((c: any) => c.volunteer) : []),
    ]).filter(Boolean);

    setResponders((prev) => {
      // Merge while preserving local high-accuracy coordinates for current user
      return serverResponders.map((sr) => {
        if (sr.id === currentUserId) {
          const local = prev.find((p) => p.id === currentUserId);
          if (local?.latitude != null && local?.longitude != null) {
            return { ...sr, latitude: local.latitude, longitude: local.longitude };
          }
        }
        return sr;
      });
    });
  }, [requestData, currentUserId]);

  const activeRespondersWithCoords = responders.filter(
    (r) => r.latitude != null && r.longitude != null
  );

  const respondersWithDistances = activeRespondersWithCoords.map((r) => ({
    ...r,
    distanceKm: haversineDistanceKm(
      { latitude: victimLat, longitude: victimLng },
      { latitude: r.latitude!, longitude: r.longitude! }
    ),
  })).sort((a, b) => a.distanceKm - b.distanceKm);

  const nearestResponder = respondersWithDistances[0];

  return (
    <div className="w-full h-80 rounded-3xl overflow-hidden border border-[color:var(--border)] relative bg-[color:var(--surface)]">
      <>
        <MapContainer
          center={[victimLat, victimLng]}
          zoom={14}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <MapBoundsUpdater
            victimLat={victimLat}
            victimLng={victimLng}
            responders={activeRespondersWithCoords}
          />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <LayerGroup>
            {/* Victim Location Pin */}
            <Marker position={[victimLat, victimLng]} icon={customIcon || undefined}>
              <Popup>
                <div>
                  <h4 className="font-bold text-[13px]">Victim Location</h4>
                  {locationName && <p className="text-xs text-slate-500 mt-0.5">{locationName}</p>}
                </div>
              </Popup>
            </Marker>

            {/* All Active Responders Pins & Polylines */}
            {activeRespondersWithCoords.map((resp) => {
              const distance = haversineDistanceKm(
                { latitude: victimLat, longitude: victimLng },
                { latitude: resp.latitude!, longitude: resp.longitude! }
              );
              const isSelf = resp.id === currentUserId;

              return (
                <LayerGroup key={resp.id}>
                  <Marker
                    position={[resp.latitude!, resp.longitude!]}
                    icon={volunteerIcon || undefined}
                  >
                    <Popup>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-[13px]">{resp.name}</h4>
                          {isSelf && (
                            <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-1 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                          Response Team Member
                        </p>
                        <p className="text-xs text-emerald-600 font-semibold">
                          Proximity: {formatDistance(distance)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                  <Polyline
                    positions={[
                      [victimLat, victimLng],
                      [resp.latitude!, resp.longitude!],
                    ]}
                    pathOptions={{ color: isSelf ? "#0ea5e9" : "#10b981", dashArray: "5, 10", weight: 3 }}
                  />
                </LayerGroup>
              );
            })}
          </LayerGroup>
        </MapContainer>

        {/* Live Distance HUD for Response Team */}
        {respondersWithDistances.length > 0 && (
          <div className="absolute bottom-4 left-4 z-[999] bg-[color:var(--surface)]/95 border border-[color:var(--border)] rounded-2xl p-3 shadow-xl backdrop-blur-md max-w-xs sm:max-w-sm">
            <div className="flex items-center justify-between gap-2 border-b border-[color:var(--border)] pb-1.5 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Response Team ({respondersWithDistances.length} Active GPS)
              </span>
              <span className="text-[11px] font-bold text-emerald-500">
                Nearest: {formatDistance(nearestResponder.distanceKm)}
              </span>
            </div>
            <div className="space-y-1 max-h-20 overflow-y-auto safe-scrollbar pr-1">
              {respondersWithDistances.map((resp) => (
                <div key={resp.id} className="flex items-center justify-between text-xs">
                  <span className="text-[color:var(--foreground)] truncate max-w-[120px]">
                    {resp.name} {resp.id === currentUserId ? "(You)" : ""}
                  </span>
                  <span className="font-semibold text-emerald-500">
                    {formatDistance(resp.distanceKm)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    </div>
  );
}
