import { Module } from "@nestjs/common";
import { AccountExecutiveGuard } from "../../common/guards/jwt-auth.guard";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, AccountExecutiveGuard],
})
export class LeadsModule {}
