export function buildTenantFrontendUrl(
  frontendUrl: string | undefined,
  subdomain: string | null | undefined,
  path: string
): string {
  const baseUrl = (frontendUrl || "").trim();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!baseUrl) {
    return normalizedPath;
  }

  try {
    const url = new URL(baseUrl);
    const tenant = (subdomain || "").trim();

    if (tenant) {
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        url.hostname = `${tenant}.${url.hostname}`;
      } else if (!url.hostname.startsWith(`${tenant}.`)) {
        url.hostname = `${tenant}.${url.hostname}`;
      }
    }

    const [pathname, search = ""] = normalizedPath.split("?", 2);
    url.pathname = pathname;
    url.search = search ? `?${search}` : "";
    return url.toString();
  } catch {
    return `${baseUrl.replace(/\/+$/g, "")}${normalizedPath}`;
  }
}
