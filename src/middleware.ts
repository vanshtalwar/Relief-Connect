import { withAuth } from "next-auth/middleware";

const authSecret = process.env.NEXTAUTH_SECRET ?? "relief-connect-dev-secret";

export default withAuth({
  secret: authSecret,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ req, token }) => {
      if (!token) return false;
      const path = req.nextUrl.pathname;
      if (path.startsWith("/coordinator")) {
        return token.role === "COORDINATOR";
      }
      return true;
    }
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/requests/:path*", "/my-requests/:path*", "/coordinator/:path*", "/notifications/:path*", "/profile/:path*"],
};