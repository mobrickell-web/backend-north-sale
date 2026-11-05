import { ForbiddenException } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

const AUTH_COOKIE_NAMES = new Set([
  "north_admin_access_token",
  "north_admin_refresh_token",
]);
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function authCookieOriginMiddleware(
  allowedOrigins: ReadonlySet<string>,
) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!STATE_CHANGING_METHODS.has(request.method)) {
      next();
      return;
    }

    const origin = request.get("origin");
    const hasAuthCookie = request.headers.cookie
      ?.split(";")
      .some((part) => AUTH_COOKIE_NAMES.has(part.split("=", 1)[0].trim()));

    if ((origin && !allowedOrigins.has(origin)) || (!origin && hasAuthCookie)) {
      next(
        new ForbiddenException(
          "Request origin is not allowed for cookie-authenticated operations.",
        ),
      );
      return;
    }

    next();
  };
}
