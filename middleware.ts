import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/api/auth/logout"]);
const PUBLIC_PREFIXES = ["/logo/", "/_next/", "/favicon"];
const LICENSE_EXEMPT = ["/setup", "/api/license/", "/api/auth/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)))
    return NextResponse.next();

  // Check session cookie exists
  const session = request.cookies.get("session")?.value;
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // CSRF check for mutation methods
  if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) {
    const csrfHeader = request.headers.get("x-csrf-token");
    const csrfCookie = request.cookies.get("csrf_token")?.value;
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return NextResponse.json(
        { error: "CSRF validation failed" },
        { status: 403 }
      );
    }
  }

  // License check — skip for license/auth/setup routes
  if (!LICENSE_EXEMPT.some((p) => pathname.startsWith(p))) {
    const licenseStatus = request.cookies.get("nqrust_license_status")?.value;
    if (licenseStatus !== "valid") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "license_required", message: "A valid license is required" },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/setup", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
