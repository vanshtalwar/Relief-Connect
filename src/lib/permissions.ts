import type { Role } from "./constants";

export function canCreateRequest(role?: Role | null) {
  return role === "VICTIM" || role === "VOLUNTEER" || role === "COORDINATOR";
}

export function canClaimRequest(role?: Role | null) {
  return role === "VOLUNTEER" || role === "COORDINATOR";
}

export function canModerate(role?: Role | null) {
  return role === "COORDINATOR";
}