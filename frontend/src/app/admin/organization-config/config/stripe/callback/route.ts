import { NextRequest, NextResponse } from "next/server";

function getApiBaseUrl(): string | undefined {
  const raw =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();
  return raw?.replace(/\/$/, "");
}

/**
 * Stripe Connect OAuth redirects here (frontend domain). Proxy the callback
 * to the backend API, which exchanges the code and redirects to admin settings.
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

  try {
    const response = await fetch(callbackUrl.toString(), {
      redirect: "manual",
      cache: "no-store",
    });

    const location = response.headers.get("location");
    if (location && response.status >= 300 && response.status < 400) {
      return NextResponse.redirect(location);
    }

    let reason = "Unexpected response from Stripe callback handler";
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) {
        reason = payload.message;
      }
    } catch {
      // Backend may not return JSON on failure.
    }

    settingsUrl.searchParams.set("stripe_connect", "failed");
    settingsUrl.searchParams.set("reason", reason);
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
