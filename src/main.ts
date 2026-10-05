import { Logger, RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/global-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";

async function bootstrap() {
  // rawBody is required to verify the SendGrid webhook signature: the signature
  // covers the exact bytes sent, and re-serialising parsed JSON would change
  // them and break verification.
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
  app.enableCors();

  const swaggerConfig = new DocumentBuilder()
    .setTitle("North Point Sales Group API")
    .setDescription("Appointment booking & Super Admin management API")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api-docs", app, document);

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
  Logger.log(`API running on http://localhost:${port}/api/v1`, "Bootstrap");
  Logger.log(`Swagger UI on http://localhost:${port}/api-docs`, "Bootstrap");
}

void bootstrap();
