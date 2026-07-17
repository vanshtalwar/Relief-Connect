import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ success: true, message: "If an account exists, a reset link has been sent." }, { status: 200 });
    }

    const secret = (process.env.NEXTAUTH_SECRET || "relief-connect-dev-secret") + user.passwordHash;
    const token = jwt.sign(
      { userId: user.id, email: user.email, purpose: "password_reset" },
      secret,
      { expiresIn: "1h" }
    );

    const resetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
    
    console.log(`[FORGOT PASSWORD] Reset link for ${user.email}: ${resetLink}`);

    if (process.env.GMAIL_EMAIL && process.env.GMAIL_APP_PASSWORD) {
      try {
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
            to: user.email,
            subject: "Reset your password",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Reset your ReliefConnect password</h2>
                <p>Hi ${user.name},</p>
                <p>We received a request to reset your password. Click the button below to choose a new one:</p>
                <div style="margin: 30px 0;">
                  <a href="${resetLink}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                </div>
                <p>If you didn't request this, you can safely ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eaeaea; margin: 26px 0;" />
                <p style="color: #666666; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:<br/>${resetLink}</p>
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
      } catch (err) {
        console.error("Error connecting to Nodemailer:", err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "If an account exists, a reset link has been sent."
    }, { status: 200 });

  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
