import { Prisma } from "@prisma/client";
import { demoRequests, type DemoRequest } from "./mock-data";
import { type Category, type Urgency } from "./constants";

export type GeoRequest = DemoRequest & { distanceKm?: number };

export function haversineDistanceKm(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
) {
  const earthRadiusKm = 6371;
  const latitudeDelta = degreesToRadians(second.latitude - first.latitude);
  const longitudeDelta = degreesToRadians(second.longitude - first.longitude);
  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(degreesToRadians(first.latitude)) *
      Math.cos(degreesToRadians(second.latitude)) *
      Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2);
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(distanceKm?: number | null) {
  if (distanceKm == null) {
    return "nearby";
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1_000)} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
}

export function buildNearbyRequestsSql(options: {
  lat: number;
  lng: number;
  radiusKm: number;
  category?: Category;
  urgency?: Urgency;
}) {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`status = 'OPEN'`,
    Prisma.sql`ST_DWithin(location, ST_SetSRID(ST_MakePoint(${options.lng}, ${options.lat}), 4326)::geography, ${options.radiusKm * 1000})`,
  ];

  if (options.category) {
    conditions.push(Prisma.sql`category = ${options.category}`);
  }

  if (options.urgency) {
    conditions.push(Prisma.sql`urgency = ${options.urgency}`);
  }

  return Prisma.sql`
    SELECT
      *,
      ST_Distance(location, ST_SetSRID(ST_MakePoint(${options.lng}, ${options.lat}), 4326)::geography) AS distance_m
    FROM "HelpRequest"
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY distance_m ASC
  `;
}

export function filterNearbyRequests(options: {
  lat: number;
  lng: number;
  radiusKm: number;
  category?: Category;
  urgency?: Urgency;
}) {
  return demoRequests
    .map((request) => ({
      ...request,
      distanceKm: haversineDistanceKm(
        { latitude: options.lat, longitude: options.lng },
        { latitude: request.latitude, longitude: request.longitude },
      ),
    }))
    .filter((request) => {
      const matchesRadius = (request.distanceKm ?? 0) <= options.radiusKm;
      const matchesCategory = !options.category || request.category === options.category;
      const matchesUrgency = !options.urgency || request.urgency === options.urgency;
      return matchesRadius && matchesCategory && matchesUrgency;
    })
    .sort((first, second) => (first.distanceKm ?? 0) - (second.distanceKm ?? 0));
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}