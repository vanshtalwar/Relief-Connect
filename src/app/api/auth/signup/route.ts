import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDemoUser, getDemoUserByEmail } from "@/lib/demo-store";
import { signupSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existingDemoUser = getDemoUserByEmail(parsed.data.email);
  if (existingDemoUser) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const existingDatabaseUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existingDatabaseUser) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  if (parsed.data.phone) {
    const existingPhone = await prisma.user.findFirst({
      where: { phone: parsed.data.phone },
    });
    if (existingPhone) {
      return NextResponse.json({ error: "Mobile number already registered" }, { status: 409 });
    }
  }

  if (!parsed.data.otp) {
    return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
  }

  const otpRecords = await prisma.$queryRaw<any[]>`
    SELECT * FROM "OtpVerification" WHERE email = ${parsed.data.email}
  `;
  const otpRecord = otpRecords[0];

  if (!otpRecord || otpRecord.otp !== parsed.data.otp) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
  }

  if (new Date() > new Date(otpRecord.expiresAt)) {
    return NextResponse.json({ error: "Verification code has expired" }, { status: 400 });
  }

  await prisma.$executeRaw`
    DELETE FROM "OtpVerification" WHERE email = ${parsed.data.email}
  `;

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      phone: parsed.data.phone || null,
      passwordHash,
      isVerified: true,
    },
  });

  // Keep creating in demo-store for compatibility if needed
  createDemoUser({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as "VICTIM" | "VOLUNTEER" | "COORDINATOR",
    phone: user.phone || undefined,
    passwordHash,
  });

  return NextResponse.json({ user }, { status: 201 });
}