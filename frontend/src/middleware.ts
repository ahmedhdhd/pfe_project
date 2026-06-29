import { NextRequest, NextResponse } from "next/server";

/** Paths that must not be rewritten to tenant routes (assets, Next internals, etc.) */
function shouldBypassTenantRewrite(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/tailwindcss" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Stripe OAuth callback must hit the Next.js route handler, not tenant rewrites.
  if (pathname === "/admin/organization-config/config/stripe/callback") {
    return NextResponse.next();
  }

  const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const hostname = hostHeader.split(":")?.[0];

  const baseDomains = [
    "teslaacademy.com",
    "teslaacademy.in",
    "teslaacademy.dedyn.io",
    process.env.NEXT_PUBLIC_MAIN_DOMAIN || ""
  ].filter(Boolean);

  let subdomain: string | null = null;
  let isMainDomain = false;

  for (const base of baseDomains) {
    if (hostname === base || hostname === `www.${base}`) {
      isMainDomain = true;
      break;
    } else if (hostname.endsWith(`.${base}`)) {
      subdomain = hostname.replace(`.${base}`, "");
      break;
    }
  }

  // Handle main domain (e.g., teslaacademy.com or teslaacademy.dedyn.io) - admin and teacher dashboards
  if (isMainDomain) {
    // Allow admin, teacher, login, and root routes on main domain
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/teacher") ||
      pathname.startsWith("/login") ||
      pathname === "/"
    ) {
      return NextResponse.next();
    }

    // For other routes on main domain, show homepage
    return NextResponse.next();
  }

  // Handle subdomain requests (e.g., mit.teslaacademy.dedyn.io)
  if (subdomain) {
    if (shouldBypassTenantRewrite(pathname)) {
      return NextResponse.next();
    }

    const url = new URL(request.url);

    // Add subdomain to search params for client identification
    url.searchParams.set("subdomain", subdomain);

    // Rewrite to [client] route structure with actual subdomain
    if (pathname === "/") {
      url.pathname = `/${subdomain}`;
      return NextResponse.rewrite(url);
    }

    // Handle login on subdomain
    if (pathname === "/login") {
      url.pathname = `/${subdomain}/login`;
      return NextResponse.rewrite(url);
    }

    // Handle student routes on subdomain
    if (pathname.startsWith("/student")) {
      url.pathname = `/${subdomain}${pathname}`;
      return NextResponse.rewrite(url);
    }

    // For other routes on subdomain, rewrite to client routes
    url.pathname = `/${subdomain}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Handle localhost subdomain like mit.localhost
  if (hostname.endsWith(".localhost")) {
    if (shouldBypassTenantRewrite(pathname)) {
      return NextResponse.next();
    }

    const url = new URL(request.url);
    const tenant = hostname.replace(".localhost", "");

    url.searchParams.set("subdomain", tenant);

    if (pathname === "/") {
      url.pathname = `/${tenant}`;
      return NextResponse.rewrite(url);
    }

    if (pathname === "/login") {
      url.pathname = `/${tenant}/login`;
      return NextResponse.rewrite(url);
    }

    if (pathname.startsWith("/student")) {
      url.pathname = `/${tenant}${pathname}`;
      return NextResponse.rewrite(url);
    }

    url.pathname = `/${tenant}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Handle Vercel preview/staging environment with path-based routing
  // e.g., quezt-learn-lms-xyz.vercel.app/{tenant}/
  if (hostname.includes("vercel.app")) {
    // Only handle path-based routing for the main vercel app (not preview deployments)
    if (
      hostname === "quezt-learn-lms.vercel.app" &&
      pathname.startsWith("/[client]")
    ) {
      return NextResponse.next();
    }

    // For preview deployments, support path-based tenant routing
    const pathParts = pathname.split("/").filter(Boolean);
    if (
      pathParts.length > 0 &&
      !pathParts[0].startsWith("_") &&
      ![
        "admin",
        "teacher",
        "login",
        "api",
        "register-admin",
        "set-password",
        "verify-email",
      ].includes(pathParts[0])
    ) {
      const tenant = pathParts[0];
      const remainingPath = "/" + pathParts.slice(1).join("/");

      const url = new URL(request.url);
      url.searchParams.set("subdomain", tenant);

      if (remainingPath === "/" || remainingPath === "") {
        url.pathname = `/[client]`;
      } else {
        url.pathname = `/[client]${remainingPath}`;
      }

      return NextResponse.rewrite(url);
    }
  }

  // Handle localhost development - simulate subdomain behavior
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
    // Check if there's a subdomain in the URL
    const url = new URL(request.url);
    const subdomainFromUrl = url.searchParams.get("subdomain");

    if (subdomainFromUrl) {
      // For development, treat localhost with subdomain param as if it's a real subdomain
      // Rewrite to [client] routes just like production
      if (pathname === "/") {
        url.pathname = `/${subdomainFromUrl}`;
        url.searchParams.set("subdomain", subdomainFromUrl);
        return NextResponse.rewrite(url);
      }
      // Handle login route
      if (pathname === "/login") {
        url.pathname = `/${subdomainFromUrl}/login`;
        url.searchParams.set("subdomain", subdomainFromUrl);
        return NextResponse.rewrite(url);
      }
      // Handle student routes
      if (pathname.startsWith("/student")) {
        url.pathname = `/${subdomainFromUrl}${pathname}`;
        url.searchParams.set("subdomain", subdomainFromUrl);
        return NextResponse.rewrite(url);
      }
      // For other routes, rewrite to [client] routes
      url.pathname = `/${subdomainFromUrl}${pathname}`;
      url.searchParams.set("subdomain", subdomainFromUrl);
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - .well-known (SSL certificate validation paths)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|\\.well-known).*)",
  ],
};
