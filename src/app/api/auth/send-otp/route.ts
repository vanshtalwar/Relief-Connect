import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, phone } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user already exists
    const existingDatabaseUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingDatabaseUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    if (phone) {
      const existingPhone = await prisma.user.findFirst({
        where: { phone },
      });
      
      if (existingPhone) {
        return NextResponse.json({ error: "Mobile number already registered" }, { status: 409 });
      }
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in DB using raw SQL to bypass Prisma Client generation lock on Windows
    const id = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "OtpVerification" (id, email, otp, "expiresAt", "createdAt") 
      VALUES (${id}, ${email}, ${otp}, ${expiresAt}, NOW())
      ON CONFLICT (email) 
      DO UPDATE SET otp = ${otp}, "expiresAt" = ${expiresAt}, "createdAt" = NOW()
    `;

    // Send email
    if (process.env.GMAIL_EMAIL && process.env.GMAIL_APP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_EMAIL,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      await new Promise((resolve, reject) => {
        transporter.sendMail({
          from: `"ReliefConnect" <${process.env.GMAIL_EMAIL}>`,
          to: email,
          subject: "Your ReliefConnect Verification Code",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
              <h2 style="color: #333;">Verify your email address</h2>
              <p style="color: #555; line-height: 1.5;">Thank you for signing up for ReliefConnect!</p>
              <p style="color: #555; line-height: 1.5;">Your 6-digit verification code is:</p>
              <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0ea5e9; margin: 30px 0; text-align: center; background: #f8fafc; padding: 20px; border-radius: 8px;">
                ${otp}
              </div>
              <p style="color: #777; font-size: 13px;">This code will expire in 10 minutes.</p>
              <hr style="border: none; border-top: 1px solid #eaeaea; margin: 26px 0;" />
              <p style="color: #999; font-size: 11px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        }, (err, info) => {
          if (err) {
            console.error("Error sending email:", err);
            reject(err);
          } else {
            console.log("Email sent successfully:", info.messageId);
            resolve(info);
          }
        });
      });
    } else {
      console.log(`[DEV ONLY] OTP for ${email} is ${otp}`);
    }

    return NextResponse.json({ success: true, message: "OTP sent" }, { status: 200 });
  } catch (error) {
    console.error("OTP send error:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
