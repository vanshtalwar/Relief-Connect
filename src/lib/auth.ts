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
    async jwt({ token, user, account, profile }: any) {
      const oauthImage =
        user?.image ||
        (user as any)?.picture ||
        (profile as any)?.picture ||
        (profile as any)?.avatar_url ||
        (token as any)?.picture ||
        (token as any)?.image ||
        null;

      if (account?.provider === "google" && user?.email) {
        // Sync Google user with our database safely
        let dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        const imageToSave = oauthImage || dbUser?.image || null;

        if (dbUser) {
          await prisma.user.update({
            where: { email: user.email },
            data: {
              name: user.name || dbUser.name || "Unknown",
              ...(imageToSave ? { image: imageToSave } : {}),
            },
          });
          dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        } else {
          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || "Unknown",
              image: imageToSave,
              role: "VICTIM",
              isVerified: true,
              backgroundCheck: false,
              locationConsent: false,
            },
          });
        }

        if (dbUser) {
          token.userId = dbUser.id;
          token.name = dbUser.name;
          token.role = dbUser.role;
          token.image = dbUser.image || oauthImage;
          token.picture = token.image;
          token.phone = dbUser.phone;
        }
      } else if (user) {
        // Normal credentials sign in
        token.userId = user.id;
        token.name = user.name;
        token.role = (user as { role?: typeof token.role }).role ?? token.role ?? "VICTIM";
        token.image = (user as { image?: string | null }).image || oauthImage;
        token.picture = token.image;
        token.phone = (user as { phone?: string | null }).phone ?? null;
      }

      // Always sync token with latest database state using email or id/sub
      const lookupEmail = (token.email as string) || (user?.email as string);
      const lookupId = (token.userId as string) || (token.sub as string);

      if (lookupEmail || lookupId) {
        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              ...(lookupEmail ? [{ email: lookupEmail }] : []),
              ...(lookupId ? [{ id: lookupId }] : []),
            ],
          },
          select: { id: true, role: true, phone: true, image: true, name: true, email: true },
        });

        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.phone = dbUser.phone;
          token.image = dbUser.image || token.image || (token as any).picture || oauthImage;
          token.picture = token.image;
          token.name = dbUser.name;

          // Auto-heal database record if image was previously null
          if (!dbUser.image && token.image) {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { image: token.image as string },
            }).catch(() => {});
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) || (token.sub as string) || "";
        if (token.name) {
          session.user.name = token.name as string;
        }
        session.user.role = (token.role as string) ?? "VICTIM";
        session.user.image = (token.image as string) || (token.picture as string) || (session.user as any).image || null;
        session.user.phone = (token.phone as string) ?? null;

        // Ensure user image is never null if available in the database
        if (!session.user.image && session.user.id) {
          try {
            const dbU = await prisma.user.findUnique({
              where: { id: session.user.id },
              select: { image: true },
            });
            if (dbU?.image) {
              session.user.image = dbU.image;
            }
          } catch {}
        }
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};