import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Res,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Response } from "express";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import {
  ClientUserGuard,
  JwtAuthGuard,
} from "../../../common/guards/jwt-auth.guard";
import type { AdminAuth } from "../../../common/interfaces/admin-auth.interface";
import { EngagementService } from "../engagement.service";

@ApiTags("Client Engagement")
@ApiSecurity("access-cookie")
@ApiUnauthorizedResponse({ description: "Missing or invalid auth session" })
@ApiForbiddenResponse({ description: "Client (USER) role required" })
@UseGuards(JwtAuthGuard, ClientUserGuard)
@Controller("client")
export class ClientEngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  @Get("dashboard")
  @ApiOperation({
    summary:
      "Get session-scoped client dashboard aggregate (items 1–6 client edition)",
  })
  @ApiOkResponse({ description: "Client dashboard data" })
  getDashboard(@CurrentUser() user: AdminAuth) {
    return this.engagementService.getDashboard(user.id);
  }

  @Get("baselines")
  @ApiOperation({ summary: "Get own baseline metrics" })
  getBaselines(@CurrentUser() user: AdminAuth) {
    return this.engagementService.findBaselineMetrics(user.id);
  }

  @Get("improvements")
  @ApiOperation({ summary: "Get own agreed improvements" })
  getImprovements(@CurrentUser() user: AdminAuth) {
    return this.engagementService.findImprovements(user.id);
  }

  @Get("kpis")
  @ApiOperation({ summary: "Get own KPI measurements" })
  getKpis(@CurrentUser() user: AdminAuth) {
    return this.engagementService.findKpiMeasurements(user.id);
  }

  @Get("milestones")
  @ApiOperation({ summary: "Get own implementation milestones" })
  getMilestones(@CurrentUser() user: AdminAuth) {
    return this.engagementService.findMilestones(user.id);
  }

  @Get("reports")
  @ApiOperation({ summary: "Get own published engagement reports" })
  getReports(@CurrentUser() user: AdminAuth) {
    return this.engagementService.findClientReports(user.id);
  }

  @Get("reports/:id")
  @ApiOperation({
    summary: "Get one published report (client edition, no fileKey)",
  })
  getReport(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.engagementService.getClientReport(user.id, id);
  }

  @Get("reports/:id/download")
  @ApiOperation({
    summary: "Download own published report file (guarded private stream)",
  })
  @ApiProduces("application/octet-stream")
  @ApiOkResponse({ description: "Report file stream" })
  @Header("X-Content-Type-Options", "nosniff")
  async downloadReport(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.engagementService.downloadClientReport(
      user.id,
      id,
      user.id,
    );
    res.setHeader("Content-Type", file.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.downloadName.replace(/"/g, "")}"`,
    );
    return new StreamableFile(file.stream);
  }
}
