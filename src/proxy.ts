import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const authSecret = process.env.NEXTAUTH_SECRET ?? "relief-connect-dev-secret";

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: authSecret });
  const path = request.nextUrl.pathname;

  // Protect coordinator routes
  if (path.startsWith("/coordinator")) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (token.role !== "COORDINATOR") {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Protect all other routes in the matcher
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/requests/:path*",
    "/my-requests/:path*",
    "/coordinator/:path*",
    "/notifications/:path*",
    "/profile/:path*"
  ],
};