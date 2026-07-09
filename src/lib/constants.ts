export const roles = ["VICTIM", "VOLUNTEER", "COORDINATOR"] as const;
export type Role = (typeof roles)[number];

export const categories = ["MEDICAL", "FOOD", "WATER", "SHELTER", "RESCUE", "OTHER"] as const;
export type Category = (typeof categories)[number];

export const urgencies = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type Urgency = (typeof urgencies)[number];

export const requestStatuses = ["OPEN", "CLAIMED", "IN_PROGRESS", "RESOLVED", "CANCELLED"] as const;
export type RequestStatus = (typeof requestStatuses)[number];

export const categoryLabels: Record<Category, string> = {
  MEDICAL: "Medical",
  FOOD: "Food",
  WATER: "Water",
  SHELTER: "Shelter",
  RESCUE: "Rescue",
  OTHER: "Other",
};

export const urgencyMeta: Record<Urgency, { label: string; color: string; icon: string }> = {
  LOW: { label: "Low", color: "#16a34a", icon: "●" },
  MEDIUM: { label: "Medium", color: "#d97706", icon: "▲" },
  HIGH: { label: "High", color: "#ea580c", icon: "◆" },
  CRITICAL: { label: "Critical", color: "#dc2626", icon: "!" },
};

export const requestStatusLabels: Record<RequestStatus, string> = {
  OPEN: "Open",
  CLAIMED: "Claimed",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CANCELLED: "Cancelled",
};