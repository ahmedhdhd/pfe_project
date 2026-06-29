import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

/**
 * Stripe Connect OAuth redirects here (frontend domain). Proxy the callback
 * to the backend API, which exchanges the code and redirects to admin settings.
 */
export async function GET(request: NextRequest) {
  const settingsUrl = new URL("/admin/settings", request.url);

  if (!API_BASE_URL) {
    settingsUrl.searchParams.set("stripe_connect", "failed");
    settingsUrl.searchParams.set("reason", "Backend API URL is not configured");
    return NextResponse.redirect(settingsUrl);
  }

  const callbackUrl = new URL(
    "/admin/organization-config/config/stripe/callback",
    API_BASE_URL
  );
  callbackUrl.search = request.nextUrl.search;

  try {
    const response = await fetch(callbackUrl.toString(), {
      redirect: "manual",
      cache: "no-store",
    });

    const location = response.headers.get("location");
    if (location && response.status >= 300 && response.status < 400) {
      return NextResponse.redirect(location);
    }

    settingsUrl.searchParams.set("stripe_connect", "failed");
    settingsUrl.searchParams.set(
      "reason",
      "Unexpected response from Stripe callback handler"
    );
    return NextResponse.redirect(settingsUrl);
  } catch (error) {
    settingsUrl.searchParams.set("stripe_connect", "failed");
    settingsUrl.searchParams.set(
      "reason",
      error instanceof Error ? error.message : "Failed to connect Stripe account"
    );
    return NextResponse.redirect(settingsUrl);
  }
}
