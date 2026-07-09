import { addMinutes, subHours, subDays } from "date-fns";
import { categories, requestStatuses, roles, urgencies } from "./constants";

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: (typeof roles)[number];
  phone?: string;
  passwordHash?: string;
};

export type DemoRequest = {
  id: string;
  title: string;
  description: string;
  category: (typeof categories)[number];
  urgency: (typeof urgencies)[number];
  status: (typeof requestStatuses)[number];
  latitude: number;
  longitude: number;
  photoUrl?: string;
  clientUuid: string;
  requesterId: string;
  volunteerId?: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: Array<{ status: (typeof requestStatuses)[number]; changedAt: string; note?: string }>;
};

export type DemoAlert = {
  id: string;
  message: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  createdBy: string;
  createdAt: string;
};

export type DemoNotification = {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export const demoUsers: DemoUser[] = [
  { id: "user-coord", name: "Duty Coordinator", email: "coordinator@reliefconnect.dev", role: "COORDINATOR", phone: "+91 90000 00001" },
  { id: "user-volunteer", name: "Harbor Volunteer", email: "volunteer@reliefconnect.dev", role: "VOLUNTEER", phone: "+91 90000 00002" },
  { id: "user-victim", name: "Community Resident", email: "victim@reliefconnect.dev", role: "VICTIM", phone: "+91 90000 00003" },
];

const now = new Date();

export const demoRequests: DemoRequest[] = [
  {
    id: "req-1",
    title: "Need bottled water for 18 families",
    description: "Floodwater cut access to the block. Seniors and children need water within the hour.",
    category: "WATER",
    urgency: "CRITICAL",
    status: "OPEN",
    latitude: 18.963,
    longitude: 72.8258,
    clientUuid: "seed-req-1",
    requesterId: "user-victim",
    createdAt: subHours(now, 2).toISOString(),
    updatedAt: subHours(now, 2).toISOString(),
    statusHistory: [{ status: "OPEN", changedAt: subHours(now, 2).toISOString(), note: "Posted from offline queue" }],
  },
  {
    id: "req-2",
    title: "Medical kit required near the school",
    description: "Minor injuries reported after debris cleanup. Need gauze and antiseptic.",
    category: "MEDICAL",
    urgency: "HIGH",
    status: "CLAIMED",
    latitude: 18.9721,
    longitude: 72.8142,
    clientUuid: "seed-req-2",
    requesterId: "user-victim",
    volunteerId: "user-volunteer",
    createdAt: subHours(now, 4).toISOString(),
    updatedAt: subHours(now, 1).toISOString(),
    statusHistory: [
      { status: "OPEN", changedAt: subHours(now, 4).toISOString() },
      { status: "CLAIMED", changedAt: subHours(now, 1).toISOString(), note: "Assigned to Harbor Volunteer" },
    ],
  },
  {
    id: "req-3",
    title: "Dry food packets for shelter",
    description: "Temporary shelter is short on breakfast packs for the morning round.",
    category: "FOOD",
    urgency: "MEDIUM",
    status: "IN_PROGRESS",
    latitude: 18.9429,
    longitude: 72.8033,
    clientUuid: "seed-req-3",
    requesterId: "user-victim",
    volunteerId: "user-volunteer",
    createdAt: subDays(now, 1).toISOString(),
    updatedAt: addMinutes(subHours(now, 6), 10).toISOString(),
    statusHistory: [
      { status: "OPEN", changedAt: subDays(now, 1).toISOString() },
      { status: "CLAIMED", changedAt: addMinutes(subHours(now, 6), 5).toISOString() },
      { status: "IN_PROGRESS", changedAt: addMinutes(subHours(now, 6), 10).toISOString() },
    ],
  },
  {
    id: "req-4",
    title: "Rescue help for rooftop isolation",
    description: "One elderly resident needs evacuation from a low-rise building.",
    category: "RESCUE",
    urgency: "CRITICAL",
    status: "OPEN",
    latitude: 18.995,
    longitude: 72.833,
    clientUuid: "seed-req-4",
    requesterId: "user-victim",
    createdAt: subHours(now, 3).toISOString(),
    updatedAt: subHours(now, 3).toISOString(),
    statusHistory: [{ status: "OPEN", changedAt: subHours(now, 3).toISOString() }],
  },
  {
    id: "req-5",
    title: "Temporary shelter for a displaced family",
    description: "Family of five needs shelter until roads reopen.",
    category: "SHELTER",
    urgency: "HIGH",
    status: "RESOLVED",
    latitude: 18.9497,
    longitude: 72.8215,
    clientUuid: "seed-req-5",
    requesterId: "user-victim",
    volunteerId: "user-volunteer",
    createdAt: subDays(now, 2).toISOString(),
    updatedAt: subDays(now, 2).toISOString(),
    statusHistory: [
      { status: "OPEN", changedAt: subDays(now, 2).toISOString() },
      { status: "CLAIMED", changedAt: subDays(now, 2).toISOString() },
      { status: "IN_PROGRESS", changedAt: subDays(now, 2).toISOString() },
      { status: "RESOLVED", changedAt: subDays(now, 2).toISOString(), note: "Shelter secured" },
    ],
  },
];

export const demoAlerts: DemoAlert[] = [
  {
    id: "alert-1",
    message: "Flood water rising in Sector 12 - evacuate low-lying homes.",
    latitude: 18.96,
    longitude: 72.825,
    radiusKm: 5,
    createdBy: "user-coord",
    createdAt: subMinutes(now, 35).toISOString(),
  },
];

export const demoNotifications: DemoNotification[] = [
  { id: "note-1", userId: "user-victim", message: "A volunteer claimed your water request.", read: false, createdAt: subMinutes(now, 25).toISOString() },
  { id: "note-2", userId: "user-volunteer", message: "You are near two critical requests.", read: false, createdAt: subMinutes(now, 15).toISOString() },
  { id: "note-3", userId: "user-coord", message: "Analytics summary refreshed for the last 24 hours.", read: true, createdAt: subMinutes(now, 50).toISOString() },
];

function subMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() - minutes * 60_000);
}