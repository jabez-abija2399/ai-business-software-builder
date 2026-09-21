import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/projects", "/settings"];
const authRoutes = ["/signin", "/signup"];
const publicApiRoutes = ["/api/auth"];

const sessionCookieNames = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

function readSessionToken(req: NextRequest): string {
  for (const name of sessionCookieNames) {
    if (req.cookies.has(name) || req.cookies.has(`${name}.0`)) {
      return req.cookies.get(name)?.value || req.cookies.get(`${name}.0`)?.value || "";
    }
  }
  return "";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionToken = readSessionToken(req);

  const isAuthenticated = !!sessionToken;

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if the route is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Check if the route is a public API route
  const isPublicApiRoute = publicApiRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if the route is an API route
  const isApiRoute = pathname.startsWith("/api");

  // If the user is not authenticated and trying to access a protected route
  if (!isAuthenticated && isProtectedRoute) {
    const signInUrl = new URL("/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If the user is authenticated and trying to access an auth route
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL("/projects", req.url));
  }

  // For API routes, return 401 if not authenticated (skip public API routes)
  if (isApiRoute && !isPublicApiRoute && !isAuthenticated) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
