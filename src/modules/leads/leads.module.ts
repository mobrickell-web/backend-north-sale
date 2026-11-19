import { Module } from "@nestjs/common";
import { AuditModule } from "../../common/audit/audit.module";
import { CrmStaffGuard } from "../../common/guards/jwt-auth.guard";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";

@Module({
  imports: [AuditModule],
  controllers: [LeadsController],
  providers: [LeadsService, CrmStaffGuard],
  exports: [LeadsService],
})
export class LeadsModule {}
