import { Module } from "@nestjs/common";
import {
  ClientUserGuard,
  SuperAdminGuard,
} from "../../common/guards/jwt-auth.guard";
import { AdminAuditController } from "./admin/admin-audit.controller";
import { AdminEngagementController } from "./admin/admin-engagement.controller";
import { AdminReportsController } from "./admin/admin-reports.controller";
import { ClientEngagementController } from "./client/client-engagement.controller";
import { EngagementService } from "./engagement.service";
import { ReportStorageService } from "./report-storage.service";

@Module({
  controllers: [
    ClientEngagementController,
    AdminEngagementController,
    AdminReportsController,
    AdminAuditController,
  ],
  providers: [
    EngagementService,
    ReportStorageService,
    SuperAdminGuard,
    ClientUserGuard,
  ],
  exports: [EngagementService],
})
export class EngagementModule {}
