import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  JwtAuthGuard,
  SuperAdminGuard,
} from "../../../common/guards/jwt-auth.guard";
import { AuditService } from "../../../common/audit/audit.service";
import { AdminAuditQueryDto } from "../dto/admin-audit-query.dto";

@ApiTags("Admin Audit")
@ApiSecurity("access-cookie")
@ApiUnauthorizedResponse({ description: "Missing or invalid admin auth" })
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller("admin/audit-logs")
export class AdminAuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({
    summary:
      "List recent audit events (publish, complete, on-behalf, download, access)",
  })
  @ApiOkResponse({ description: "Audit log rows, newest first" })
  list(@Query() query: AdminAuditQueryDto) {
    return this.audit.list({
      clientId: query.clientId,
      take: query.take,
    });
  }
}
