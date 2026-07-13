import bcrypt from "bcryptjs";
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

        // End of fallback removal
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
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = (user as { role?: typeof token.role }).role ?? token.role ?? "VICTIM";
        token.image = (user as { image?: string | null }).image ?? null;
        token.phone = (user as { phone?: string | null }).phone ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const userId = token.userId ?? "";
        
        // Keep active session data in sync with the database
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { image: true, role: true },
        });
        if (dbUser) {
          token.image = dbUser.image;
          token.role = dbUser.role;
        }

        session.user.id = userId;
        session.user.role = token.role ?? "VICTIM";
        session.user.image = token.image ?? null;
        session.user.phone = token.phone ?? null;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};