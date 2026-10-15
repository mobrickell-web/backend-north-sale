import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { resolve } from "node:path";
import configuration from "./config/configuration";
import { PrismaModule } from "./database/prisma.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ContactModule } from "./modules/contact/contact.module";
import { HealthModule } from "./modules/health/health.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      envFilePath: [
        resolve(process.cwd(), ".env"),
        resolve(process.cwd(), ".env.local"),
      ],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 50 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    AppointmentsModule,
    ContactModule,
    HealthModule,
    WebhooksModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
