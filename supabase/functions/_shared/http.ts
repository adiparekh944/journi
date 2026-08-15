const DEFAULT_ALLOWED_HEADERS = ["authorization", "content-type", "x-client-info"].join(
  ", ",
);

function allowedOrigin(request: Request): string {
  const requestOrigin = request.headers.get("origin");
  const configuredOrigins =
    optionalEnvironmentValue("ALLOWED_ORIGINS")?.split(",") ?? [];
  const normalizedOrigins = configuredOrigins.map((origin) => origin.trim());

  if (requestOrigin && normalizedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  return normalizedOrigins[0] ?? "http://localhost:5173";
}

export function corsHeaders(request: Request): HeadersInit {
  return {
    "access-control-allow-headers": DEFAULT_ALLOWED_HEADERS,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-origin": allowedOrigin(request),
    vary: "Origin",
  };
}

export function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders(request),
  });
}

export function optionsResponse(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export function methodNotAllowed(request: Request): Response {
  return jsonResponse(request, { error: "Method not allowed" }, 405);
}

export function errorResponse(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const status = message === "Authentication is required" ? 401 : 500;
  return jsonResponse(request, { error: message }, status);
}
import { optionalEnvironmentValue } from "./runtime.ts";
