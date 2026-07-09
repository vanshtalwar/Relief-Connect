"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import "leaflet/dist/leaflet.css";
import { haversineDistanceKm, formatDistance } from "@/lib/geo";
import { useSession } from "next-auth/react";
import { useLowBandwidth } from "./low-bandwidth-provider";

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

function MapBoundsUpdater({ victimLat, victimLng, volunteerLat, volunteerLng }: { victimLat: number; victimLng: number; volunteerLat?: number | null; volunteerLng?: number | null }) {
  const map = require("react-leaflet").useMap();
  useEffect(() => {
    if (typeof window !== "undefined" && window.L) {
      const bounds = window.L.latLngBounds([[victimLat, victimLng]]);
      if (volunteerLat != null && volunteerLng != null) {
        bounds.extend([volunteerLat, volunteerLng]);
      }
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
    }
  }, [victimLat, victimLng, volunteerLat, volunteerLng, map]);
  return null;
}

export function RequestDetailMap({
  requestId,
  victimLat,
  victimLng,
  locationName,
  initialVolunteer,
}: {
  requestId: string;
  victimLat: number;
  victimLng: number;
  locationName?: string | null;
  initialVolunteer?: { id: string; name: string; latitude: number | null; longitude: number | null } | null;
}) {
  const { data: session } = useSession();
  const [volunteer, setVolunteer] = useState(initialVolunteer);
  const { isLowBandwidth } = useLowBandwidth();

  // Volunteer location tracking uploads
  useEffect(() => {
    if (!volunteer || (session?.user as any)?.id !== volunteer.id || !("geolocation" in navigator)) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Instantly update local state for zero-latency UI updates as the volunteer walks
        setVolunteer((prev: any) => ({
          ...(prev || { id: (session?.user as any)?.id, name: (session?.user as any)?.name }),
          latitude,
          longitude,
        }));
        
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
  }, [session, volunteer]);

  // Request details polling
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/requests/${requestId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.request && data.request.volunteer) {
            setVolunteer(data.request.volunteer);
          }
        }
      } catch (err) {
        console.error("Error polling request details:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [requestId]);

  const hasVolunteerCoords = volunteer && volunteer.latitude != null && volunteer.longitude != null;

  return (
    <div className="w-full h-80 rounded-3xl overflow-hidden border border-[color:var(--border)] relative bg-[color:var(--surface)]">
      {isLowBandwidth ? (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[color:var(--foreground)]/60 bg-[color:var(--background)]/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          <p className="font-semibold text-[color:var(--foreground)]">Low Bandwidth Mode Active</p>
          <p className="mt-1 text-xs max-w-xs">Live map disabled to save data.</p>
          {hasVolunteerCoords && (
            <div className="mt-4 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-3 shadow-md">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Live Distance</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatDistance(haversineDistanceKm(
                  { latitude: victimLat, longitude: victimLng },
                  { latitude: volunteer.latitude!, longitude: volunteer.longitude! }
                ))}
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
      <MapContainer
        center={[victimLat, victimLng]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
      >
        <MapBoundsUpdater 
          victimLat={victimLat} 
          victimLng={victimLng} 
          volunteerLat={volunteer?.latitude} 
          volunteerLng={volunteer?.longitude} 
        />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        
        <Marker position={[victimLat, victimLng]} icon={customIcon || undefined}>
          <Popup>
            <div>
              <h4 className="font-bold">Victim Location</h4>
              {locationName && <p className="text-xs text-slate-500">{locationName}</p>}
            </div>
          </Popup>
        </Marker>

        {hasVolunteerCoords && (
          <>
            <Marker
              position={[volunteer.latitude!, volunteer.longitude!]}
              icon={volunteerIcon || undefined}
            >
              <Popup>
                <div>
                  <h4 className="font-bold">Volunteer ({volunteer.name})</h4>
                  <p className="text-xs text-emerald-600 font-semibold">
                    Proximity: {formatDistance(haversineDistanceKm(
                      { latitude: victimLat, longitude: victimLng },
                      { latitude: volunteer.latitude!, longitude: volunteer.longitude! }
                    ))}
                  </p>
                </div>
              </Popup>
            </Marker>
            <Polyline
              positions={[
                [victimLat, victimLng],
                [volunteer.latitude!, volunteer.longitude!]
              ]}
              pathOptions={{ color: "#10b981", dashArray: "5, 10", weight: 3 }}
            />
          </>
        )}
      </MapContainer>

      {hasVolunteerCoords && !isLowBandwidth && (
        <div className="absolute bottom-4 left-4 z-[999] bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-3 shadow-xl backdrop-blur-md">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Live Distance</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatDistance(haversineDistanceKm(
              { latitude: victimLat, longitude: victimLng },
              { latitude: volunteer.latitude!, longitude: volunteer.longitude! }
            ))}
          </p>
          </div>
        )}
        </>
      )}
    </div>
  );
}
