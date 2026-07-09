import { openDB } from "idb";
import type { SyncAction } from "./schemas";

const DB_NAME = "relief-connect-offline";
const STORE_NAME = "pending-actions";
const DB_VERSION = 1;

export type PendingAction = SyncAction & {
  clientUuid: string;
  pendingSync: true;
  createdAt: string;
};

async function getDatabase() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "clientUuid" });
      }
    },
  });
}

export async function enqueueAction(action: SyncAction) {
  const db = await getDatabase();
  const pendingAction: PendingAction = {
    ...action,
    clientUuid: crypto.randomUUID(),
    pendingSync: true,
    createdAt: new Date().toISOString(),
  };
  await db.put(STORE_NAME, pendingAction);
  return pendingAction;
}

export async function listPendingActions() {
  const db = await getDatabase();
  return (await db.getAll(STORE_NAME)) as PendingAction[];
}

export async function clearPendingAction(clientUuid: string) {
  const db = await getDatabase();
  await db.delete(STORE_NAME, clientUuid);
}

export async function syncPendingActions() {
  const pendingActions = await listPendingActions();
  if (!pendingActions.length) {
    return [];
  }

  // This keeps the conflict model intentionally simple: latest server write wins.
  const response = await fetch("/api/requests/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actions: pendingActions }),
  });

  if (!response.ok) {
    throw new Error("Failed to sync queued actions");
  }

  const payload = (await response.json()) as { synced: Array<{ clientUuid: string }> };
  await Promise.all(payload.synced.map((entry) => clearPendingAction(entry.clientUuid)));
  return payload.synced;
}

export function getOfflineMessage(isOnline: boolean, pendingCount: number) {
  if (!isOnline) {
    return "Offline - actions will queue locally";
  }

  if (pendingCount > 0) {
    return `${pendingCount} queued action${pendingCount === 1 ? "" : "s"} waiting to sync`;
  }

  return "Live sync active";
}