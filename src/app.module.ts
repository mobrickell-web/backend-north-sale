import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { resolve } from "node:path";
import { AuditModule } from "./common/audit/audit.module";
import configuration from "./config/configuration";
import { PrismaModule } from "./database/prisma.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { AssessmentResultsModule } from "./modules/assessment-results/assessment-results.module";
import { AssessmentsModule } from "./modules/assessments/assessments.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ContactModule } from "./modules/contact/contact.module";
import { HealthModule } from "./modules/health/health.module";
import { LeadsModule } from "./modules/leads/leads.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { EngagementModule } from "./modules/engagement/engagement.module";

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
    // Session checks (/auth/me) are SkipThrottle'd; this covers general API traffic.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    AuthModule,
    AppointmentsModule,
    AssessmentsModule,
    ContactModule,
    HealthModule,
    LeadsModule,
    AssessmentResultsModule,
    WebhooksModule,
    EngagementModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
