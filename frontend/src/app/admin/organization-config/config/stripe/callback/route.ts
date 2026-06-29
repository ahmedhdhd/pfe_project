import { NextRequest, NextResponse } from "next/server";

function getApiBaseUrl(): string | undefined {
  const raw =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();
  return raw?.replace(/\/$/, "");
}

/**
 * Stripe Connect OAuth redirects here (frontend domain — registered in Stripe).
 * Immediately forward the browser to the backend callback handler so Azure
 * does not time out waiting on a server-side fetch between web apps.
 */
export async function GET(request: NextRequest) {
  const settingsUrl = new URL("/admin/settings", request.url);
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    settingsUrl.searchParams.set("stripe_connect", "failed");
    settingsUrl.searchParams.set("reason", "Backend API URL is not configured");
    return NextResponse.redirect(settingsUrl);
  }

  const callbackUrl = new URL(
    "/admin/organization-config/config/stripe/callback",
    apiBaseUrl
  );
  callbackUrl.search = request.nextUrl.search;

  return NextResponse.redirect(callbackUrl.toString(), 307);
}
