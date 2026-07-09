import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existingReview = await prisma.review.findFirst({
      where: {
        requestId: parsed.data.requestId,
        reviewerId: session.user.id,
      }
    });

    if (existingReview) {
      return NextResponse.json({ error: "You have already reviewed this request." }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        requestId: parsed.data.requestId,
        reviewerId: session.user.id,
        revieweeId: parsed.data.revieweeId,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      }
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("POST review error:", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
