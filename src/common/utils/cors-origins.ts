/**
 * Build the credentialed CORS / cookie-Origin allowlist.
 * For any non-loopback host, both apex and www variants are included so
 * browser calls do not fail when users land on either hostname.
 */
export function resolveAllowedOrigins(input: {
  corsOrigins?: string;
  frontendUrl?: string;
  appUrl?: string;
  nodeEnv?: string;
  port?: string;
}): string[] {
  const raw = [
    ...(input.corsOrigins ?? "").split(","),
    input.frontendUrl ?? "http://localhost:3000",
    input.appUrl ?? "http://localhost:3001",
    ...(input.nodeEnv === "production"
      ? []
      : [
          `http://localhost:${input.port ?? "3001"}`,
          `http://127.0.0.1:${input.port ?? "3001"}`,
        ]),
  ];

  const expanded = new Set<string>();
  for (const value of raw) {
    for (const origin of expandOriginVariants(value)) {
      expanded.add(origin);
    }
  }
  return [...expanded];
}

export function expandOriginVariants(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const url = new URL(trimmed);
    const origins = [url.origin];
    const host = url.hostname.toLowerCase();

    if (host === "localhost" || host === "127.0.0.1") {
      return origins;
    }

    if (host.startsWith("www.")) {
      const apex = new URL(url.origin);
      apex.hostname = host.slice(4);
      origins.push(apex.origin);
      return origins;
    }

    if (host.includes(".")) {
      const www = new URL(url.origin);
      www.hostname = `www.${host}`;
      origins.push(www.origin);
    }

    return origins;
  } catch {
    return [];
  }
}
