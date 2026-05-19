import type { Metadata } from "next";
import { headers } from "next/headers";
import { ClientConfigWrapper } from "@/components/client/config-wrapper";
import type { OrganizationConfigResponse } from "@/lib/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface ClientLayoutProps {
  children: React.ReactNode;
}

// Extract subdomain from host header as fallback
function extractSubdomainFromHost(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")?.[0] || "";

  // Handle production subdomains (e.g., mityy.teslaacademy.com)
  if (
    hostname.endsWith(".teslaacademy.com") ||
    hostname.endsWith(".teslaacademy.in")
  ) {
    const parts = hostname.split(".");
    if (parts.length > 2) {
      return parts[0];
    }
  }

  // Handle localhost subdomain (e.g., mityy.localhost)
  if (hostname.endsWith(".localhost")) {
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      return parts[0];
    }
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ client: string }>;
}): Promise<Metadata> {
  const { client: slug } = await params;

  // Fallback: try to extract from headers if slug is missing
  const headersList = await headers();
  const host = headersList.get("host");
  const subdomainFromHost = extractSubdomainFromHost(host);
  const finalSlug = slug || subdomainFromHost;

  if (!API_BASE_URL || !finalSlug) {
    return {
      title: "TeslaAcademy LMS",
      description: "Modern learning platform powered by TeslaAcademy.",
    };
  }

  try {
    // Normalize API URL to avoid double slashes
    const baseUrl = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL;
    const apiUrl = `${baseUrl}/api/organization-config/${finalSlug}`;

    const res = await fetch(apiUrl, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(
        `Failed to fetch organization config for slug: ${finalSlug} (${res.status})`
      );
    }

    const json = (await res.json()) as OrganizationConfigResponse;

    if (!json.success || !json.data) {
      throw new Error("Invalid organization config response");
    }

    const config = json.data;

    const title =
      config.metaTitle || config.heroTitle || config.name || "TeslaAcademy LMS";

    const description =
      config.metaDescription ||
      config.description ||
      "Simple, structured learning experiences for students and organizations.";

    const ogImage = config.ogImage || config.bannerUrls?.[0];

    const siteUrl =
      config.domain && config.domain.startsWith("http")
        ? config.domain
        : config.domain
        ? `https://${config.domain}`
        : undefined;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: siteUrl,
        siteName: config.name ?? "TeslaAcademy",
        images: ogImage ? [{ url: ogImage }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImage ? [ogImage] : undefined,
      },
    };
  } catch (error) {
    return {
      title: "TeslaAcademy LMS",
      description: "Modern learning platform powered by TeslaAcademy.",
    };
  }
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return <ClientConfigWrapper>{children}</ClientConfigWrapper>;
}
