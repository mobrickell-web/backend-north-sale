import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { memoryStorage } from "multer";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import {
  JwtAuthGuard,
  SuperAdminGuard,
} from "../../../common/guards/jwt-auth.guard";
import type { AdminAuth } from "../../../common/interfaces/admin-auth.interface";
import { CreateBaselineMetricDto } from "../dto/create-baseline-metric.dto";
import { CreateImplementationMilestoneDto } from "../dto/create-implementation-milestone.dto";
import { CreateImprovementDto } from "../dto/create-improvement.dto";
import { CreateKpiMeasurementDto } from "../dto/create-kpi-measurement.dto";
import { UpdateBaselineMetricDto } from "../dto/update-baseline-metric.dto";
import { UpdateEngagementReportDto } from "../dto/update-engagement-report.dto";
import { UpdateImplementationMilestoneDto } from "../dto/update-implementation-milestone.dto";
import { UpdateImprovementDto } from "../dto/update-improvement.dto";
import { UpdateKpiMeasurementDto } from "../dto/update-kpi-measurement.dto";
import { UploadEngagementReportDto } from "../dto/upload-engagement-report.dto";
import { EngagementService } from "../engagement.service";

@ApiTags("Admin Client Engagement")
@ApiSecurity("access-cookie")
@ApiUnauthorizedResponse({ description: "Missing or invalid admin auth" })
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller("admin/clients/:clientId")
export class AdminEngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  // =========================================================================
  // 1. BASELINE METRICS
  // =========================================================================
  @Get("baselines")
  @ApiOperation({ summary: "List baseline metrics for client" })
  listBaselines(@Param("clientId", ParseUUIDPipe) clientId: string) {
    return this.engagementService.findBaselineMetrics(clientId);
  }

  @Post("baselines")
  @HttpCode(201)
  @ApiOperation({ summary: "Create baseline metric for client" })
  @ApiCreatedResponse({ description: "Baseline metric created" })
  createBaseline(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Body() dto: CreateBaselineMetricDto,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.engagementService.createBaselineMetric(clientId, dto, admin.id);
  }

  @Get("baselines/:id")
  @ApiOperation({ summary: "Get baseline metric by ID" })
  getBaseline(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.engagementService.findBaselineMetricById(clientId, id);
  }

  @Patch("baselines/:id")
  @ApiOperation({ summary: "Update baseline metric" })
  updateBaseline(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateBaselineMetricDto,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.engagementService.updateBaselineMetric(
      clientId,
      id,
      dto,
      admin.id,
    );
  }

  @Delete("baselines/:id")
  @ApiOperation({ summary: "Delete baseline metric" })
  deleteBaseline(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.engagementService.deleteBaselineMetric(clientId, id, admin.id);
  }

  // =========================================================================
  // 2. IMPROVEMENTS
  // =========================================================================
  @Get("improvements")
  @ApiOperation({ summary: "List improvements for client" })
  listImprovements(@Param("clientId", ParseUUIDPipe) clientId: string) {
    return this.engagementService.findImprovements(clientId);
  }

  @Post("improvements")
  @HttpCode(201)
  @ApiOperation({ summary: "Create improvement action item for client" })
  @ApiCreatedResponse({ description: "Improvement created" })
  createImprovement(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Body() dto: CreateImprovementDto,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.engagementService.createImprovement(clientId, dto, admin.id);
  }

  @Get("improvements/:id")
  @ApiOperation({ summary: "Get improvement by ID" })
  getImprovement(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.engagementService.findImprovementById(clientId, id);
  }

  @Patch("improvements/:id")
  @ApiOperation({ summary: "Update improvement" })
  updateImprovement(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateImprovementDto,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.engagementService.updateImprovement(
      clientId,
      id,
      dto,
      admin.id,
    );
  }

  @Delete("improvements/:id")
  @ApiOperation({ summary: "Delete improvement" })
  deleteImprovement(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.engagementService.deleteImprovement(clientId, id, admin.id);
  }

  // =========================================================================
  // 3. KPI MEASUREMENTS
  // =========================================================================
  @Get("kpis")
  @ApiOperation({ summary: "List KPI measurements for client" })
  listKpis(@Param("clientId", ParseUUIDPipe) clientId: string) {
    return this.engagementService.findKpiMeasurements(clientId);
  }

  @Post("kpis")
  @HttpCode(201)
  @ApiOperation({ summary: "Create KPI measurement for client" })
  @ApiCreatedResponse({ description: "KPI measurement created" })
  createKpi(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Body() dto: CreateKpiMeasurementDto,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.engagementService.createKpiMeasurement(clientId, dto, admin.id);
  }

  @Get("kpis/:id")
  @ApiOperation({ summary: "Get KPI measurement by ID" })
  getKpi(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.engagementService.findKpiMeasurementById(clientId, id);
  }

  @Patch("kpis/:id")
  @ApiOperation({ summary: "Update KPI measurement" })
  updateKpi(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateKpiMeasurementDto,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.engagementService.updateKpiMeasurement(
      clientId,
      id,
      dto,
      admin.id,
    );
  }

  @Delete("kpis/:id")
  @ApiOperation({ summary: "Delete KPI measurement" })
  deleteKpi(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.engagementService.deleteKpiMeasurement(clientId, id, admin.id);
  }

  // =========================================================================
  // 4. IMPLEMENTATION MILESTONES
  // =========================================================================
  @Get("milestones")
  @ApiOperation({ summary: "List implementation milestones for client" })
  listMilestones(@Param("clientId", ParseUUIDPipe) clientId: string) {
    return this.engagementService.findMilestones(clientId);
  }

  @Post("milestones")
  @HttpCode(201)
  @ApiOperation({ summary: "Create implementation milestone for client" })
  @ApiCreatedResponse({ description: "Milestone created" })
  createMilestone(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Body() dto: CreateImplementationMilestoneDto,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.engagementService.createMilestone(clientId, dto, admin.id);
  }

  @Get("milestones/:id")
  @ApiOperation({ summary: "Get milestone by ID" })
  getMilestone(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.engagementService.findMilestoneById(clientId, id);
  }

  @Patch("milestones/:id")
  @ApiOperation({ summary: "Update implementation milestone" })
  updateMilestone(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateImplementationMilestoneDto,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.engagementService.updateMilestone(clientId, id, dto, admin.id);
  }

  @Delete("milestones/:id")
  @ApiOperation({ summary: "Delete implementation milestone" })
  deleteMilestone(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.engagementService.deleteMilestone(clientId, id, admin.id);
  }

  // =========================================================================
  // 5. ENGAGEMENT REPORTS
  // =========================================================================
  @Get("reports")
  @ApiOperation({
    summary: "List engagement reports for client (incl. drafts)",
  })
  listReports(@Param("clientId", ParseUUIDPipe) clientId: string) {
    return this.engagementService.findReports(clientId);
  }

  @Post("reports/upload")
  @HttpCode(201)
  @ApiOperation({
    summary: "Upload a client-edition report file into private storage",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["title", "type", "period", "file"],
      properties: {
        title: { type: "string" },
        type: { type: "string", enum: ["QUARTERLY", "FINAL", "OTHER"] },
        period: { type: "string" },
        summary: { type: "string" },
        file: { type: "string", format: "binary" },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Report uploaded (draft until published)",
  })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  uploadReport(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Body() dto: UploadEngagementReportDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() admin: AdminAuth,
  ) {
    if (!file) {
      throw new BadRequestException("Report file is required");
    }
    return this.engagementService.uploadReport(clientId, dto, file, admin.id);
  }

  @Get("reports/:id")
  @ApiOperation({ summary: "Get engagement report by ID" })
  getReport(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.engagementService.findReportById(clientId, id);
  }

  @Patch("reports/:id")
  @ApiOperation({ summary: "Update engagement report" })
  updateReport(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateEngagementReportDto,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.engagementService.updateReport(clientId, id, dto, admin.id);
  }

  @Delete("reports/:id")
  @ApiOperation({ summary: "Delete engagement report" })
  deleteReport(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.engagementService.deleteReport(clientId, id, admin.id);
  }
}
