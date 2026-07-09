import { z } from "zod";
import { categories, requestStatuses, roles, urgencies } from "./constants";

export const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum([roles[0], roles[1]]),
  phone: z.string().min(7).optional().or(z.literal("")),
  skills: z.array(z.string()).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const requestSchema = z.object({
  title: z.string().min(4).max(120),
  description: z.string().min(20).max(1_000),
  category: z.enum(categories),
  urgency: z.enum(urgencies),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  locationName: z.string().optional().nullable(),
  contactName: z.string().min(2),
  contactPhone: z.string().min(7),
  contactEmail: z.string().email().optional().or(z.literal("")),
  photoUrl: z.string().optional().or(z.literal("")),
  isSOS: z.boolean().optional(),
  clientUuid: z.string().uuid(),
});

export const nearbySchema = z.object({
  lat: z.coerce.number().finite(),
  lng: z.coerce.number().finite(),
  radiusKm: z.coerce.number().min(1).max(250).default(10),
  category: z.enum(categories).optional(),
  urgency: z.enum(urgencies).optional(),
});

export const claimSchema = z.object({
  note: z.string().max(500).optional(),
});

export const statusSchema = z.object({
  status: z.enum(requestStatuses),
  note: z.string().max(500).optional(),
});

export const alertSchema = z.object({
  message: z.string().min(8).max(240),
  latitude: z.coerce.number().finite(),
  longitude: z.coerce.number().finite(),
  radiusKm: z.coerce.number().min(1).max(100),
});

export const syncActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CREATE_REQUEST"), payload: requestSchema }),
  z.object({ type: z.literal("CLAIM_REQUEST"), payload: z.object({ requestId: z.string().uuid(), note: z.string().optional() }) }),
  z.object({ type: z.literal("UPDATE_STATUS"), payload: z.object({ requestId: z.string().uuid(), status: z.enum(requestStatuses), note: z.string().optional() }) }),
  z.object({ type: z.literal("RESOLVE_REQUEST"), payload: z.object({ requestId: z.string().uuid() }) }),
]);

export const reviewSchema = z.object({
  requestId: z.string().uuid(),
  revieweeId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export type SyncAction = z.infer<typeof syncActionSchema>;