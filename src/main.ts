import { Logger, RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/global-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { authCookieOriginMiddleware } from "./common/middleware/auth-cookie-origin.middleware";

async function bootstrap() {
  // Webhook signatures cover the exact bytes sent; re-serializing parsed JSON
  // would invalidate verification.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use((req: Request, res: Response, next: NextFunction) => {
    req.id = randomUUID();
    res.setHeader("X-Request-Id", req.id);
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  // Health probes are deliberately kept outside /api/v1 so that uptime
  // monitors and the platform healthcheck can hit a short, stable path.
  app.setGlobalPrefix("api/v1", {
    exclude: [
      { path: "health", method: RequestMethod.GET },
      { path: "health/live", method: RequestMethod.GET },
      { path: "health/ready", method: RequestMethod.GET },
      // Provider callbacks use stable, short paths configured in SendGrid.
      { path: "webhooks/sendgrid", method: RequestMethod.POST },
    ],
  });
  const allowedOrigins = [
    ...(process.env.CORS_ORIGINS ?? "").split(","),
    process.env.FRONTEND_URL ?? "http://localhost:3000",
    process.env.APP_URL ?? "http://localhost:3001",
    ...(process.env.NODE_ENV === "production"
      ? []
      : [
          `http://localhost:${process.env.PORT ?? "3001"}`,
          `http://127.0.0.1:${process.env.PORT ?? "3001"}`,
        ]),
  ]
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin).origin);
  const allowedOriginSet = new Set(allowedOrigins);
  app.use(authCookieOriginMiddleware(allowedOriginSet));
  app.enableCors({ origin: allowedOrigins, credentials: true });

  // The document describes every endpoint and cookie contract, so it is only
  // ever mounted on a developer machine.
  if (process.env.NODE_ENV !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("North Point Sales Group API")
      .setDescription("Appointment booking & Super Admin management API")
      .setVersion("0.1.0")
      .addCookieAuth(
        "north_admin_access_token",
        {
          type: "apiKey",
          in: "cookie",
          name: "north_admin_access_token",
          description:
            "HttpOnly access-token cookie set by login or refresh. The browser sends it automatically.",
        },
        "access-cookie",
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api-docs", app, document);
  }

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
  Logger.log(`API running on http://localhost:${port}/api/v1`, "Bootstrap");
  if (process.env.NODE_ENV !== "production") {
    Logger.log(`Swagger UI on http://localhost:${port}/api-docs`, "Bootstrap");
  }
}

void bootstrap();
