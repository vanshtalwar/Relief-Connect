import { NextResponse } from "next/server";
import { buildCoordinatorSummary } from "@/lib/analytics";

export async function GET() {
  return NextResponse.json({ summary: buildCoordinatorSummary() });
}