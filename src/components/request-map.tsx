"use client";

import React, { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { categoryLabels, urgencyMeta, type Category, type Urgency } from "@/lib/constants";
import type { DemoRequest } from "@/lib/mock-data";
import { RequestCard } from "./request-card";
import { useSession } from "next-auth/react";
import "leaflet/dist/leaflet.css";
import { haversineDistanceKm, formatDistance } from "@/lib/geo";
import { useLowBandwidth } from "./low-bandwidth-provider";
import { useMap } from "react-leaflet";

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

const DEFAULT_CENTER: [number, number] = [18.963, 72.8258];

const customIcon = typeof window !== "undefined" ? require("leaflet").icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
}) : null;

const volunteerIcon = typeof window !== "undefined" ? require("leaflet").icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: "volunteer-marker-icon",
}) : null;

const userIcon = typeof window !== "undefined" ? require("leaflet").icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: "user-marker-icon",
}) : null;

function MapBoundsUpdater({ requests, boundsKey, userLocation }: { requests: any[], boundsKey?: string, userLocation?: {lat: number, lng: number} | null }) {
  const map = useMap();
  const hasZoomedToUserRef = React.useRef(false);

  useEffect(() => {
    if (!requests || requests.length === 0) {
      if (userLocation && !hasZoomedToUserRef.current) {
        hasZoomedToUserRef.current = true;
        map.setView([userLocation.lat, userLocation.lng], 15, { animate: true, duration: 1 });
      }
      return;
    }

    const lats = requests.map((r) => r.latitude);
    const lngs = requests.map((r) => r.longitude);

    if (userLocation && !hasZoomedToUserRef.current) {
      lats.push(userLocation.lat);
      lngs.push(userLocation.lng);
      hasZoomedToUserRef.current = true;
    }

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    map.fitBounds(
      [
        [minLat, minLng],
        [maxLat, maxLng]
      ],
      { padding: [50, 50], maxZoom: 15, animate: true, duration: 1 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsKey, map, userLocation]);
  return null;
}

function RecenterControl({ userLocation }: { userLocation: {lat: number, lng: number} | null }) {
  const map = useMap();
  
  if (!userLocation) return null;

  return (
    <div className="leaflet-bottom leaflet-left" style={{ zIndex: 1000, pointerEvents: 'auto', marginBottom: '20px', marginLeft: '10px' }}>
      <div className="leaflet-control">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            map.setView([userLocation.lat, userLocation.lng], 15, { animate: true, duration: 1 });
          }}
          className="flex items-center gap-2 bg-[color:var(--muted)] text-[color:var(--foreground)] px-3 py-2 text-[12px] font-semibold tracking-wide rounded-md shadow-md border border-[color:var(--border)] hover:bg-[color:var(--surface)] transition-colors"
          title="Recenter on my location"
        >
          📍 Recenter on Me
        </button>
      </div>
    </div>
  );
}

export function RequestMap({ requests }: { requests: any[] }) {
  const { data: session } = useSession();
  const [liveRequests, setLiveRequests] = useState<any[]>(requests);
  const [category, setCategory] = useState<Category | "ALL">("ALL");
  const [urgency, setUrgency] = useState<Urgency | "ALL">("ALL");
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const { isLowBandwidth } = useLowBandwidth();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLiveRequests(requests);
  }, [requests]);

  // Watch position for map rendering, upload to db if VOLUNTEER
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        if (session?.user?.role === "VOLUNTEER") {
          try {
            await fetch("/api/users/location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ latitude, longitude }),
            });
          } catch (err) {
            console.error("Failed to upload volunteer location:", err);
          }
        }
      },
      (err) => console.log("Watch position error:", err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [session]);

  // Dynamic dashboard polling
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/requests");
        if (res.ok) {
          const data = await res.json();
          setLiveRequests(data.requests || []);
        }
      } catch (err) {
        console.error("Error polling requests:", err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredRequests = useMemo(() => {
    return liveRequests.filter((request) => (category === "ALL" || request.category === category) && (urgency === "ALL" || request.urgency === urgency));
  }, [category, liveRequests, urgency]);

  return (
    <div className="w-full h-full">
      <section className="bg-[color:var(--muted)] overflow-hidden flex flex-col h-full w-full">
        <div className="border-b border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill label={`All (${filteredRequests.length})`} active={category === "ALL" && urgency === "ALL"} onClick={() => {
              setCategory("ALL");
              setUrgency("ALL");
            }} />
            {Object.keys(categoryLabels).map((value) => (
              <FilterPill key={value} label={categoryLabels[value as Category]} active={category === value} onClick={() => setCategory(value as Category)} />
            ))}
            <div className="ml-auto flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--foreground)]/50">Urgency</span>
              <select className="focus-ring cursor-pointer rounded-md border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--foreground)] transition-colors hover:border-[color:var(--border-strong)] outline-none" value={urgency} onChange={(event) => setUrgency(event.target.value as Urgency | "ALL")}>
                <option value="ALL">All Levels</option>
                {Object.keys(urgencyMeta).map((value) => (
                  <option key={value} value={value}>
                    {urgencyMeta[value as Urgency].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="grid gap-0 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="h-[400px] overflow-y-auto safe-scrollbar border-b border-[color:var(--border)] xl:border-b-0 xl:border-r bg-[color:var(--muted)]">
            <div className="grid gap-3 p-4 sm:p-5">
              {filteredRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          </div>
          <div className="h-[400px] bg-[color:var(--background)] relative z-0">
            {isLowBandwidth ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[color:var(--foreground)]/50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <p className="font-semibold text-lg text-[color:var(--foreground)]">Low Bandwidth Mode Active</p>
                <p className="mt-2 text-[13px] max-w-md">Live map tracking is disabled to conserve data. Please use the list view to coordinate effectively.</p>
              </div>
            ) : (
              <>
                <style>{`
                  .volunteer-marker-icon {
                    filter: hue-rotate(120deg) !important;
                  }
                  .user-marker-icon {
                    filter: hue-rotate(280deg) !important;
                  }
                  .leaflet-popup-content-wrapper {
                    background: var(--surface) !important;
                    color: var(--foreground) !important;
                  }
                  .leaflet-popup-tip {
                    background: var(--surface) !important;
                  }
                `}</style>
                <MapContainer center={DEFAULT_CENTER} zoom={12} className="h-full w-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                  <MapBoundsUpdater requests={filteredRequests} boundsKey={`${category}-${urgency}`} userLocation={userLocation} />
                  <RecenterControl userLocation={userLocation} />
                  
                  {userLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon || undefined} zIndexOffset={1000}>
                      <Popup>
                        <div className="font-medium text-[13px]">📍 You are here</div>
                      </Popup>
                    </Marker>
                  )}
                  
                  {filteredRequests.map((request) => (
                    <LayerGroup key={request.id}>
                      <Marker position={[request.latitude, request.longitude]} icon={customIcon || undefined}>
                        <Popup>
                          <div className="max-w-xs">
                            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--foreground)]/55">{categoryLabels[request.category as Category]}</p>
                            <h3 className="text-base font-semibold">{request.title}</h3>
                            <p className="text-sm text-[color:var(--foreground)]/72">{request.description}</p>
                            {request.locationName && (
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
                                📍 {request.locationName}
                              </p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                      {request.status !== "OPEN" && request.volunteer && request.volunteer.latitude && request.volunteer.longitude && (
                        <LayerGroup>
                          <Marker
                            position={[request.volunteer.latitude, request.volunteer.longitude]}
                            icon={volunteerIcon || undefined}
                          >
                            <Popup>
                              <div>
                                <p className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">Volunteer (En Route)</p>
                                <h4 className="font-bold">{request.volunteer.name}</h4>
                                <p className="text-xs text-slate-500">Live tracker coordinates</p>
                                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2">
                                  Proximity: {formatDistance(haversineDistanceKm(
                                    { latitude: request.latitude, longitude: request.longitude },
                                    { latitude: request.volunteer.latitude, longitude: request.volunteer.longitude }
                                  ))}
                                </p>
                              </div>
                            </Popup>
                          </Marker>
                          <Polyline
                            positions={[
                              [request.latitude, request.longitude],
                              [request.volunteer.latitude, request.volunteer.longitude]
                            ]}
                            pathOptions={{ color: "#10b981", dashArray: "5, 10", weight: 3 }}
                          />
                        </LayerGroup>
                      )}
                    </LayerGroup>
                  ))}
                </MapContainer>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring rounded-full border px-3 py-2 text-sm backdrop-blur-md transition duration-300 ${active ? "border-sky-400 bg-sky-400/20 text-sky-700 dark:text-sky-100 shadow-sm" : "border-[color:var(--border)] bg-[color:var(--surface)]/50 text-[color:var(--foreground)]/78 hover:-translate-y-0.5 hover:border-sky-400/40 hover:bg-[color:var(--surface-strong)]/60"}`}
    >
      {label}
    </button>
  );
}