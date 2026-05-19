const HAS_SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:\/\//i;

const PROVIDER_BY_HOST: Array<{ suffix: string; name: string }> = [
  { suffix: "docs.google.com", name: "Google Docs" },
  { suffix: "drive.google.com", name: "Google Drive" },
  { suffix: "notion.so", name: "Notion" },
  { suffix: "youtube.com", name: "YouTube" },
  { suffix: "youtu.be", name: "YouTube" },
  { suffix: "vimeo.com", name: "Vimeo" },
];

export interface ExternalResourceDisplay {
  normalizedUrl: string;
  embedUrl: string | null;
  providerLabel: string;
}

export function normalizeExternalUrl(rawUrl?: string | null): string {
  const trimmed = rawUrl?.trim() || "";
  if (!trimmed) return "";

  if (HAS_SCHEME_REGEX.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  return `https://${trimmed}`;
}

function extractGoogleWorkspaceEmbed(url: URL): string | null {
  const match = url.pathname.match(
    /^\/(document|spreadsheets|presentation)\/d\/([^/]+)/
  );

  if (!match) return null;

  const type = match[1];
  const id = match[2];

  if (type === "presentation") {
    return `${url.origin}/presentation/d/${id}/embed`;
  }

  return `${url.origin}/${type}/d/${id}/preview`;
}

function extractGoogleDriveEmbed(url: URL): string | null {
  const match = url.pathname.match(/^\/file\/d\/([^/]+)/);
  if (!match) return null;
  return `${url.origin}/file/d/${match[1]}/preview`;
}

function extractYoutubeEmbed(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  let videoId = "";

  if (host.includes("youtu.be")) {
    videoId = url.pathname.replace("/", "");
  } else {
    videoId = url.searchParams.get("v") || "";
  }

  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}`;
}

function resolveProviderLabel(url: URL, explicitProvider?: string | null): string {
  const trimmedProvider = explicitProvider?.trim();
  if (trimmedProvider) {
    return trimmedProvider;
  }

  const hostname = url.hostname.toLowerCase();
  const providerMatch = PROVIDER_BY_HOST.find((item) =>
    hostname.endsWith(item.suffix)
  );

  return providerMatch?.name || "External resource";
}

function resolveEmbedUrl(url: URL): string | null {
  const hostname = url.hostname.toLowerCase();

  if (hostname.endsWith("docs.google.com")) {
    return extractGoogleWorkspaceEmbed(url);
  }

  if (hostname.endsWith("drive.google.com")) {
    return extractGoogleDriveEmbed(url);
  }

  if (hostname.endsWith("youtube.com") || hostname.endsWith("youtu.be")) {
    return extractYoutubeEmbed(url);
  }

  if (hostname.endsWith("notion.so")) {
    return null;
  }

  return url.toString();
}

export function buildExternalResourceDisplay(
  rawUrl?: string | null,
  explicitProvider?: string | null
): ExternalResourceDisplay | null {
  const normalizedUrl = normalizeExternalUrl(rawUrl);
  if (!normalizedUrl) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    return {
      normalizedUrl,
      embedUrl: null,
      providerLabel: explicitProvider?.trim() || "External resource",
    };
  }

  return {
    normalizedUrl: parsedUrl.toString(),
    embedUrl: resolveEmbedUrl(parsedUrl),
    providerLabel: resolveProviderLabel(parsedUrl, explicitProvider),
  };
}
