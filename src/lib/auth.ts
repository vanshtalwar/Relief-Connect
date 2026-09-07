import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";
import { loginSchema } from "./schemas";

export const authSecret = process.env.NEXTAUTH_SECRET ?? "relief-connect-dev-secret";

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        // Prioritize database authentication
        const databaseUser = await prisma.user.findUnique({ where: { email } });
        if (databaseUser) {
          if (!databaseUser.passwordHash) {
            return null;
          }
          const isValid = await bcrypt.compare(password, databaseUser.passwordHash);
          if (!isValid) {
            return null;
          }
          return {
            id: databaseUser.id,
            name: databaseUser.name,
            email: databaseUser.email,
            role: databaseUser.role,
            phone: databaseUser.phone ?? undefined,
            image: databaseUser.image ?? undefined,
          };
        }

        return null;
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        // Fallback on malformed URLs
      }
      return `${baseUrl}/dashboard`;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && user?.email) {
        // Sync Google user with our database safely
        let dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        
        if (dbUser) {
          await prisma.$executeRaw`
            UPDATE "User" 
            SET name = ${user.name || "Unknown"}, image = ${user.image || null} 
            WHERE email = ${user.email}
          `;
          dbUser.name = user.name || "Unknown";
          dbUser.image = user.image || null;
        } else {
          const id = randomUUID();
          await prisma.$executeRaw`
            INSERT INTO "User" (id, email, name, image, role, "isVerified", "backgroundCheck", "locationConsent", "createdAt")
            VALUES (${id}, ${user.email}, ${user.name || "Unknown"}, ${user.image || null}, 'VICTIM', true, false, false, NOW())
          `;
          dbUser = await prisma.user.findUnique({ where: { id } });
        }

        if (dbUser) {
          token.userId = dbUser.id;
          token.name = dbUser.name;
          token.role = dbUser.role;
          token.image = dbUser.image;
          token.phone = dbUser.phone;
        }
      } else if (user) {
        // Normal credentials sign in
        token.userId = user.id;
        token.name = user.name;
        token.role = (user as { role?: typeof token.role }).role ?? token.role ?? "VICTIM";
        token.image = (user as { image?: string | null }).image ?? null;
        token.phone = (user as { phone?: string | null }).phone ?? null;
      }

      // Always sync token with latest database state on session refresh / client update()
      if (token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: { role: true, phone: true, image: true, name: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.phone = dbUser.phone;
          token.image = dbUser.image;
          token.name = dbUser.name;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) ?? "";
        if (token.name) {
          session.user.name = token.name as string;
        }
        session.user.role = (token.role as string) ?? "VICTIM";
        session.user.image = (token.image as string) ?? null;
        session.user.phone = (token.phone as string) ?? null;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};