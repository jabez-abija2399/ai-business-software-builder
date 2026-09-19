import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

const protectedRoutes = ["/projects", "/settings"];
const authRoutes = ["/signin", "/signup"];
const apiRoutes = ["/api"];
const publicApiRoutes = ["/api/auth/signup", "/api/auth/signin", "/api/auth/csrf", "/api/auth/providers", "/api/auth/session", "/api/auth/callback"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Check if the route is an API route
  const isApiRoute = apiRoutes.some((route) => pathname.startsWith(route));
  const isPublicApiRoute = publicApiRoutes.some((route) => pathname.startsWith(route));

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if the route is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // If the user is not authenticated and trying to access a protected route
  if (!req.auth && isProtectedRoute) {
    const signInUrl = new URL("/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If the user is authenticated and trying to access an auth route
  if (req.auth && isAuthRoute) {
    return NextResponse.redirect(new URL("/projects", req.url));
  }

  // For API routes, return 401 if not authenticated (skip public API routes)
  if (isApiRoute && !isPublicApiRoute && !req.auth) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
