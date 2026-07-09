import { randomUUID } from "crypto";
import { requestStatusLabels } from "./constants";
import { demoAlerts, demoNotifications, demoRequests, demoUsers, type DemoAlert, type DemoNotification, type DemoRequest, type DemoUser } from "./mock-data";
import { filterNearbyRequests, haversineDistanceKm } from "./geo";
import type { SyncAction } from "./schemas";

type Store = {
  users: typeof demoUsers;
  requests: DemoRequest[];
  alerts: DemoAlert[];
  notifications: DemoNotification[];
};

const globalForStore = globalThis as typeof globalThis & { reliefConnectStore?: Store };

export function getStore() {
  if (!globalForStore.reliefConnectStore) {
    globalForStore.reliefConnectStore = {
      users: structuredClone(demoUsers),
      requests: structuredClone(demoRequests),
      alerts: structuredClone(demoAlerts),
      notifications: structuredClone(demoNotifications),
    };
  }

  return globalForStore.reliefConnectStore;
}

export function listDemoRequests() {
  return getStore().requests.slice().sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
}

export function listDemoUsers() {
  return getStore().users;
}

export function getDemoUserByEmail(email: string) {
  return getStore().users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function createDemoUser(input: { id: string; name: string; email: string; role: DemoUser["role"]; phone?: string; passwordHash?: string }) {
  const store = getStore();
  const existing = store.users.find((user) => user.email.toLowerCase() === input.email.toLowerCase());
  if (existing) {
    return existing;
  }

  const user = {
    id: input.id,
    name: input.name,
    email: input.email,
    role: input.role,
    phone: input.phone,
    passwordHash: input.passwordHash,
  } satisfies DemoUser;

  store.users.unshift(user);
  return user;
}

export function getDemoRequest(requestId: string) {
  return getStore().requests.find((request) => request.id === requestId) ?? null;
}

export function listNearbyDemoRequests(options: {
  lat: number;
  lng: number;
  radiusKm: number;
  category?: string;
  urgency?: string;
}) {
  return filterNearbyRequests({
    lat: options.lat,
    lng: options.lng,
    radiusKm: options.radiusKm,
    category: options.category as never,
    urgency: options.urgency as never,
  });
}

export function createDemoRequest(input: {
  title: string;
  description: string;
  category: DemoRequest["category"];
  urgency: DemoRequest["urgency"];
  latitude: number;
  longitude: number;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  photoUrl?: string;
  clientUuid: string;
  requesterId?: string;
}) {
  const store = getStore();
  const existing = store.requests.find((request) => request.clientUuid === input.clientUuid);
  if (existing) {
    return existing;
  }

  const createdAt = new Date().toISOString();
  const nextRequest: DemoRequest = {
    id: randomUUID(),
    title: input.title,
    description: input.description,
    category: input.category,
    urgency: input.urgency,
    status: "OPEN",
    latitude: input.latitude,
    longitude: input.longitude,
    photoUrl: input.photoUrl || undefined,
    clientUuid: input.clientUuid,
    requesterId: input.requesterId ?? demoUsers[2].id,
    createdAt,
    updatedAt: createdAt,
    statusHistory: [{ status: "OPEN", changedAt: createdAt, note: `Created for ${input.contactName}` }],
  };

  store.requests.unshift(nextRequest);
  store.notifications.unshift({
    id: randomUUID(),
    userId: nextRequest.requesterId,
    message: `Request \"${nextRequest.title}\" is now pending volunteer review.`,
    read: false,
    createdAt,
  });

  return nextRequest;
}

export function claimDemoRequest(requestId: string, volunteerId: string, note?: string) {
  const store = getStore();
  const request = getDemoRequest(requestId);
  if (!request) {
    return null;
  }

  const volunteer = store.users.find((u) => u.id === volunteerId);
  const volunteerName = volunteer ? volunteer.name : "A volunteer";

  const requester = store.users.find((u) => u.id === request.requesterId);
  const requesterName = requester ? requester.name : "Community Resident";
  const requesterPhone = (requester && requester.phone) ? requester.phone : "N/A";

  const changedAt = new Date().toISOString();
  request.status = "CLAIMED";
  request.volunteerId = volunteerId;
  request.updatedAt = changedAt;
  request.statusHistory.push({ status: "CLAIMED", changedAt, note: note || "Volunteer accepted the request" });

  const notificationMessage = `Volunteer "${volunteerName}" claimed request "${request.title}". Category: ${request.category}, Urgency: ${request.urgency}, Requester: ${requesterName} (${requesterPhone}). Message: ${note || "No message left"}`;

  store.users.forEach((user) => {
    pushStatusNotification(user.id, notificationMessage);
  });

  return request;
}

export function updateDemoRequestStatus(requestId: string, status: DemoRequest["status"], note?: string) {
  const request = getDemoRequest(requestId);
  if (!request) {
    return null;
  }

  const changedAt = new Date().toISOString();
  request.status = status;
  request.updatedAt = changedAt;
  request.statusHistory.push({ status, changedAt, note });
  pushStatusNotification(request.requesterId, `Your request \"${request.title}\" moved to ${requestStatusLabels[status]}.`);
  return request;
}

export function updateDemoRequest(requestId: string, input: { title?: string; description?: string; category?: DemoRequest["category"]; urgency?: DemoRequest["urgency"] }) {
  const request = getDemoRequest(requestId);
  if (!request) {
    return null;
  }

  const changedAt = new Date().toISOString();
  if (input.title !== undefined) request.title = input.title;
  if (input.description !== undefined) request.description = input.description;
  if (input.category !== undefined) request.category = input.category;
  if (input.urgency !== undefined) request.urgency = input.urgency;
  request.updatedAt = changedAt;
  return request;
}

export function deleteDemoRequest(requestId: string) {
  const store = getStore();
  const index = store.requests.findIndex((request) => request.id === requestId);
  if (index !== -1) {
    store.requests.splice(index, 1);
    return true;
  }
  return false;
}

export function createDemoAlert(input: {
  message: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  createdBy: string;
}) {
  const alert: DemoAlert = {
    id: randomUUID(),
    message: input.message,
    latitude: input.latitude,
    longitude: input.longitude,
    radiusKm: input.radiusKm,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  };

  getStore().alerts.unshift(alert);
  return alert;
}

export function listActiveAlerts(latitude: number, longitude: number) {
  return getStore().alerts.filter((alert) => haversineDistanceKm({ latitude, longitude }, { latitude: alert.latitude, longitude: alert.longitude }) <= alert.radiusKm);
}

export function listNotifications(userId: string) {
  return getStore().notifications.filter((notification) => notification.userId === userId).sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export function getAnalyticsSummary() {
  const requests = getStore().requests;
  const open = requests.filter((request) => request.status === "OPEN").length;
  const resolved = requests.filter((request) => request.status === "RESOLVED").length;
  const claimed = requests.filter((request) => request.status === "CLAIMED" || request.status === "IN_PROGRESS").length;
  const activeVolunteers = new Set(requests.filter((request) => request.volunteerId).map((request) => request.volunteerId)).size;

  const byCategory = requests.reduce<Record<string, number>>((summary, request) => {
    summary[request.category] = (summary[request.category] ?? 0) + 1;
    return summary;
  }, {});

  return {
    total: requests.length,
    open,
    claimed,
    resolved,
    activeVolunteers,
    responseRate: requests.length ? Math.round((resolved / requests.length) * 100) : 0,
    byCategory,
    timeline: requests.map((request) => ({ date: request.createdAt, count: 1 })),
  };
}

export function syncOfflineActions(actions: SyncAction[]) {
  const results = actions.map((action) => {
    if (action.type === "CREATE_REQUEST") {
      return { type: action.type, request: createDemoRequest(action.payload) };
    }

    if (action.type === "CLAIM_REQUEST") {
      return { type: action.type, request: claimDemoRequest(action.payload.requestId, demoUsers[1].id, action.payload.note) };
    }

    if (action.type === "UPDATE_STATUS") {
      return { type: action.type, request: updateDemoRequestStatus(action.payload.requestId, action.payload.status, action.payload.note) };
    }

    if (action.type === "RESOLVE_REQUEST") {
      return { type: action.type, request: updateDemoRequestStatus(action.payload.requestId, "RESOLVED", "Resolved offline") };
    }

    return null;
  });

  return results;
}

function pushStatusNotification(userId: string, message: string) {
  getStore().notifications.unshift({
    id: randomUUID(),
    userId,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  });
}