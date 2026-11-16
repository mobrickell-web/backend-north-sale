import { Logger, RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/global-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { authCookieOriginMiddleware } from "./common/middleware/auth-cookie-origin.middleware";
import { resolveAllowedOrigins } from "./common/utils/cors-origins";

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
  // FRONTEND_URL / CORS_ORIGINS expand to apex + www so either hostname works.
  const allowedOrigins = resolveAllowedOrigins({
    corsOrigins: process.env.CORS_ORIGINS,
    frontendUrl: process.env.FRONTEND_URL,
    appUrl: process.env.APP_URL,
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
  });
  const allowedOriginSet = new Set(allowedOrigins);
  app.use(authCookieOriginMiddleware(allowedOriginSet));
  app.enableCors({ origin: allowedOrigins, credentials: true });
  Logger.log(
    `CORS allowlist (${allowedOrigins.length}): ${allowedOrigins.join(", ")}`,
    "Bootstrap",
  );

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
