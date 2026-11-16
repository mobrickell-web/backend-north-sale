import {
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import {
  JwtAuthGuard,
  SuperAdminGuard,
} from "../../../common/guards/jwt-auth.guard";
import type { AdminAuth } from "../../../common/interfaces/admin-auth.interface";
import { EngagementService } from "../engagement.service";

@ApiTags("Admin Reports")
@ApiSecurity("access-cookie")
@ApiUnauthorizedResponse({ description: "Missing or invalid admin auth" })
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller("admin/reports")
export class AdminReportsController {
  constructor(private readonly engagementService: EngagementService) {}

  @Post(":id/publish")
  @HttpCode(200)
  @ApiOperation({ summary: "Publish a client-edition engagement report" })
  @ApiOkResponse({ description: "Report published" })
  publish(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.engagementService.publishReport(id, admin.id);
  }
}
