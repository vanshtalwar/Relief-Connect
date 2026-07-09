import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
    })
  : null;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    if (ratelimit) {
      const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
      const { success } = await ratelimit.limit(`upload_post_${ip}`);
      if (!success) {
        return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 });
      }
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate size (e.g., 5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    // Validate type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type. Only images are allowed." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.warn("CLOUDINARY_CLOUD_NAME not set, falling back to mock URL for dev.");
      return NextResponse.json({ url: `/uploads/mock-${randomUUID()}.jpg` });
    }

    const uploadPromise = new Promise<{ url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "relief-connect" },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({ url: result.secure_url });
          }
        }
      );
      stream.end(buffer);
    });

    const result = await uploadPromise;
    
    return NextResponse.json({ url: result.url });
  } catch (error: any) {
    console.error("File upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
