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

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      phone: parsed.data.phone || null,
      passwordHash,
    },
  });

  // Keep creating in demo-store for compatibility if needed
  createDemoUser({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || undefined,
    passwordHash,
  });

  return NextResponse.json({ user }, { status: 201 });
}