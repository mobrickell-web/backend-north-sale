import { Injectable, NotFoundException } from "@nestjs/common";
import type { Readable } from "node:stream";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../database/prisma.service";
import { AuditAction, Role } from "../../generated/prisma/enums";
import type {
  AuditLogModel,
  BaselineMetricModel,
  EngagementReportModel,
  ImplementationMilestoneModel,
  ImprovementModel,
  KpiMeasurementModel,
} from "../../generated/prisma/models";
import type { CreateBaselineMetricDto } from "./dto/create-baseline-metric.dto";
import type { CreateImplementationMilestoneDto } from "./dto/create-implementation-milestone.dto";
import type { CreateImprovementDto } from "./dto/create-improvement.dto";
import type { CreateKpiMeasurementDto } from "./dto/create-kpi-measurement.dto";
import type { UpdateBaselineMetricDto } from "./dto/update-baseline-metric.dto";
import type { UpdateEngagementReportDto } from "./dto/update-engagement-report.dto";
import type { UpdateImplementationMilestoneDto } from "./dto/update-implementation-milestone.dto";
import type { UpdateImprovementDto } from "./dto/update-improvement.dto";
import type { UpdateKpiMeasurementDto } from "./dto/update-kpi-measurement.dto";
import type { UploadEngagementReportDto } from "./dto/upload-engagement-report.dto";
import { ReportStorageService } from "./report-storage.service";

export type ClientEngagementReport = {
  id: string;
  title: string;
  type: EngagementReportModel["type"];
  period: string;
  publishedAt: Date | null;
  summary: string | null;
  originalFileName: string | null;
  contentType: string | null;
  createdAt: Date;
  updatedAt: Date;
  canDownload: boolean;
};

type AuditTargetType =
  | "BaselineMetric"
  | "Improvement"
  | "KpiMeasurement"
  | "ImplementationMilestone"
  | "EngagementReport";

@Injectable()
export class EngagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportStorage: ReportStorageService,
    private readonly audit: AuditService,
  ) {}

  // =========================================================================
  // AGGREGATE DASHBOARD (Client Edition)
  // =========================================================================
  async getDashboard(clientId: string) {
    const [
      baselines,
      improvements,
      kpis,
      milestones,
      reports,
      assessmentRows,
      primaryAssessment,
    ] = await Promise.all([
      this.findBaselineMetrics(clientId),
      this.findImprovements(clientId),
      this.findKpiMeasurements(clientId),
      this.findMilestones(clientId),
      this.findClientReports(clientId),
      this.prisma.assessmentInstance.findMany({
        where: { clientId },
        include: {
          assessment: {
            select: {
              id: true,
              title: true,
              slug: true,
              isClientPrimary: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.assessment.findFirst({
        where: { isClientPrimary: true, status: "PUBLISHED" },
        select: { id: true, slug: true, title: true },
      }),
    ]);

    type AssessmentCard = {
      instanceId: string | null;
      assessmentId: string;
      assessmentTitle: string;
      assessmentSlug: string;
      status: string;
      submittedAt: Date | null;
      overallScore: number | null;
      result: {
        overallScore: number;
        sectionBreakdowns: unknown;
        reviewCount: number;
        allSame: boolean;
      } | null;
    };

    const toCard = (row: (typeof assessmentRows)[number]): AssessmentCard => {
      const rawResult =
        row.result && typeof row.result === "object" && row.result !== null
          ? (row.result as {
              overallScore?: number;
              sectionBreakdowns?: unknown;
              review?: unknown[];
              allSame?: boolean;
            })
          : null;
      const completed = row.status === "COMPLETED" && rawResult;
      return {
        instanceId: row.id,
        assessmentId: row.assessmentId,
        assessmentTitle: row.assessment.title,
        assessmentSlug: row.assessment.slug,
        status: row.status,
        submittedAt: row.submittedAt,
        overallScore: completed ? (rawResult.overallScore ?? null) : null,
        result: completed
          ? {
              overallScore: rawResult.overallScore ?? 0,
              sectionBreakdowns: rawResult.sectionBreakdowns ?? [],
              reviewCount: Array.isArray(rawResult.review)
                ? rawResult.review.length
                : 0,
              allSame: Boolean(rawResult.allSame),
            }
          : null,
      };
    };

    const assessments = assessmentRows.map(toCard);
    // Hero uses the admin-assigned client-facing primary even before the
    // client has started an instance for it.
    const primaryRow = primaryAssessment
      ? (assessmentRows.find(
          (row) => row.assessmentId === primaryAssessment.id,
        ) ?? null)
      : null;

    const assessment: AssessmentCard | null = primaryRow
      ? toCard(primaryRow)
      : primaryAssessment
        ? {
            instanceId: null,
            assessmentId: primaryAssessment.id,
            assessmentTitle: primaryAssessment.title,
            assessmentSlug: primaryAssessment.slug,
            status: "NOT_STARTED",
            submittedAt: null,
            overallScore: null,
            result: null,
          }
        : null;

    return {
      clientId,
      assessment,
      assessments,
      baselines,
      improvements,
      kpis,
      milestones,
      reports,
    };
  }

  // =========================================================================
  // CLIENT OWNERSHIP
  // =========================================================================
  async assertClientAccount(clientId: string): Promise<void> {
    const account = await this.prisma.adminUser.findUnique({
      where: { id: clientId },
      select: { id: true, role: true, isActive: true },
    });
    if (!account || account.role !== Role.USER || !account.isActive) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }
  }

  // =========================================================================
  // 1. BASELINE METRICS
  // =========================================================================
  async createBaselineMetric(
    clientId: string,
    dto: CreateBaselineMetricDto,
    actorId: string,
  ): Promise<BaselineMetricModel> {
    await this.assertClientAccount(clientId);
    const record = await this.prisma.baselineMetric.create({
      data: {
        clientId,
        metricKey: dto.metricKey,
        label: dto.label,
        value: dto.value,
        unit: dto.unit,
        measuredAt: new Date(dto.measuredAt),
        source: dto.source,
      },
    });
    await this.writeAudit({
      actorId,
      action: AuditAction.CREATE,
      targetType: "BaselineMetric",
      targetId: record.id,
      clientId,
    });
    return record;
  }

  async findBaselineMetrics(clientId: string): Promise<BaselineMetricModel[]> {
    return this.prisma.baselineMetric.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findBaselineMetricById(
    clientId: string,
    id: string,
  ): Promise<BaselineMetricModel> {
    const record = await this.prisma.baselineMetric.findFirst({
      where: { id, clientId },
    });
    if (!record) {
      throw new NotFoundException(`Baseline metric ${id} not found`);
    }
    return record;
  }

  async updateBaselineMetric(
    clientId: string,
    id: string,
    dto: UpdateBaselineMetricDto,
    actorId: string,
  ): Promise<BaselineMetricModel> {
    await this.findBaselineMetricById(clientId, id);
    const record = await this.prisma.baselineMetric.update({
      where: { id },
      data: {
        ...(dto.metricKey !== undefined ? { metricKey: dto.metricKey } : {}),
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.value !== undefined ? { value: dto.value } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.measuredAt !== undefined
          ? { measuredAt: new Date(dto.measuredAt) }
          : {}),
        ...(dto.source !== undefined ? { source: dto.source } : {}),
      },
    });
    await this.writeAudit({
      actorId,
      action: AuditAction.UPDATE,
      targetType: "BaselineMetric",
      targetId: record.id,
      clientId,
    });
    return record;
  }

  async deleteBaselineMetric(
    clientId: string,
    id: string,
    actorId: string,
  ): Promise<{ success: boolean; id: string }> {
    await this.findBaselineMetricById(clientId, id);
    await this.prisma.baselineMetric.delete({ where: { id } });
    await this.writeAudit({
      actorId,
      action: AuditAction.DELETE,
      targetType: "BaselineMetric",
      targetId: id,
      clientId,
    });
    return { success: true, id };
  }

  // =========================================================================
  // 2. IMPROVEMENTS
  // =========================================================================
  async createImprovement(
    clientId: string,
    dto: CreateImprovementDto,
    actorId: string,
  ): Promise<ImprovementModel> {
    await this.assertClientAccount(clientId);
    const record = await this.prisma.improvement.create({
      data: {
        clientId,
        title: dto.title,
        description: dto.description,
        ownerName: dto.ownerName,
        ownerSide: dto.ownerSide,
        status: dto.status,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        agreedAt: dto.agreedAt ? new Date(dto.agreedAt) : undefined,
      },
    });
    await this.writeAudit({
      actorId,
      action: AuditAction.CREATE,
      targetType: "Improvement",
      targetId: record.id,
      clientId,
    });
    return record;
  }

  async findImprovements(clientId: string): Promise<ImprovementModel[]> {
    return this.prisma.improvement.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findImprovementById(
    clientId: string,
    id: string,
  ): Promise<ImprovementModel> {
    const record = await this.prisma.improvement.findFirst({
      where: { id, clientId },
    });
    if (!record) {
      throw new NotFoundException(`Improvement ${id} not found`);
    }
    return record;
  }

  async updateImprovement(
    clientId: string,
    id: string,
    dto: UpdateImprovementDto,
    actorId: string,
  ): Promise<ImprovementModel> {
    await this.findImprovementById(clientId, id);
    const record = await this.prisma.improvement.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.ownerName !== undefined ? { ownerName: dto.ownerName } : {}),
        ...(dto.ownerSide !== undefined ? { ownerSide: dto.ownerSide } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.targetDate !== undefined
          ? { targetDate: dto.targetDate ? new Date(dto.targetDate) : null }
          : {}),
        ...(dto.agreedAt !== undefined
          ? { agreedAt: dto.agreedAt ? new Date(dto.agreedAt) : null }
          : {}),
      },
    });
    await this.writeAudit({
      actorId,
      action: AuditAction.UPDATE,
      targetType: "Improvement",
      targetId: record.id,
      clientId,
    });
    return record;
  }

  async deleteImprovement(
    clientId: string,
    id: string,
    actorId: string,
  ): Promise<{ success: boolean; id: string }> {
    await this.findImprovementById(clientId, id);
    await this.prisma.improvement.delete({ where: { id } });
    await this.writeAudit({
      actorId,
      action: AuditAction.DELETE,
      targetType: "Improvement",
      targetId: id,
      clientId,
    });
    return { success: true, id };
  }

  // =========================================================================
  // 3. KPI MEASUREMENTS
  // =========================================================================
  async createKpiMeasurement(
    clientId: string,
    dto: CreateKpiMeasurementDto,
    actorId: string,
  ): Promise<KpiMeasurementModel> {
    await this.assertClientAccount(clientId);
    const record = await this.prisma.kpiMeasurement.create({
      data: {
        clientId,
        metricKey: dto.metricKey,
        value: dto.value,
        target: dto.target,
        measuredAt: new Date(dto.measuredAt),
      },
    });
    await this.writeAudit({
      actorId,
      action: AuditAction.CREATE,
      targetType: "KpiMeasurement",
      targetId: record.id,
      clientId,
    });
    return record;
  }

  async findKpiMeasurements(clientId: string): Promise<KpiMeasurementModel[]> {
    return this.prisma.kpiMeasurement.findMany({
      where: { clientId },
      orderBy: { measuredAt: "desc" },
    });
  }

  async findKpiMeasurementById(
    clientId: string,
    id: string,
  ): Promise<KpiMeasurementModel> {
    const record = await this.prisma.kpiMeasurement.findFirst({
      where: { id, clientId },
    });
    if (!record) {
      throw new NotFoundException(`KPI measurement ${id} not found`);
    }
    return record;
  }

  async updateKpiMeasurement(
    clientId: string,
    id: string,
    dto: UpdateKpiMeasurementDto,
    actorId: string,
  ): Promise<KpiMeasurementModel> {
    await this.findKpiMeasurementById(clientId, id);
    const record = await this.prisma.kpiMeasurement.update({
      where: { id },
      data: {
        ...(dto.metricKey !== undefined ? { metricKey: dto.metricKey } : {}),
        ...(dto.value !== undefined ? { value: dto.value } : {}),
        ...(dto.target !== undefined ? { target: dto.target } : {}),
        ...(dto.measuredAt !== undefined
          ? { measuredAt: new Date(dto.measuredAt) }
          : {}),
      },
    });
    await this.writeAudit({
      actorId,
      action: AuditAction.UPDATE,
      targetType: "KpiMeasurement",
      targetId: record.id,
      clientId,
    });
    return record;
  }

  async deleteKpiMeasurement(
    clientId: string,
    id: string,
    actorId: string,
  ): Promise<{ success: boolean; id: string }> {
    await this.findKpiMeasurementById(clientId, id);
    await this.prisma.kpiMeasurement.delete({ where: { id } });
    await this.writeAudit({
      actorId,
      action: AuditAction.DELETE,
      targetType: "KpiMeasurement",
      targetId: id,
      clientId,
    });
    return { success: true, id };
  }

  // =========================================================================
  // 4. IMPLEMENTATION MILESTONES
  // =========================================================================
  async createMilestone(
    clientId: string,
    dto: CreateImplementationMilestoneDto,
    actorId: string,
  ): Promise<ImplementationMilestoneModel> {
    await this.assertClientAccount(clientId);
    const record = await this.prisma.implementationMilestone.create({
      data: {
        clientId,
        title: dto.title,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        ownerName: dto.ownerName,
        ownerSide: dto.ownerSide,
        status: dto.status,
      },
    });
    await this.writeAudit({
      actorId,
      action: AuditAction.CREATE,
      targetType: "ImplementationMilestone",
      targetId: record.id,
      clientId,
    });
    return record;
  }

  async findMilestones(
    clientId: string,
  ): Promise<ImplementationMilestoneModel[]> {
    return this.prisma.implementationMilestone.findMany({
      where: { clientId },
      orderBy: { createdAt: "asc" },
    });
  }

  async findMilestoneById(
    clientId: string,
    id: string,
  ): Promise<ImplementationMilestoneModel> {
    const record = await this.prisma.implementationMilestone.findFirst({
      where: { id, clientId },
    });
    if (!record) {
      throw new NotFoundException(`Milestone ${id} not found`);
    }
    return record;
  }

  async updateMilestone(
    clientId: string,
    id: string,
    dto: UpdateImplementationMilestoneDto,
    actorId: string,
  ): Promise<ImplementationMilestoneModel> {
    await this.findMilestoneById(clientId, id);
    const record = await this.prisma.implementationMilestone.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.startDate !== undefined
          ? { startDate: dto.startDate ? new Date(dto.startDate) : null }
          : {}),
        ...(dto.dueDate !== undefined
          ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
          : {}),
        ...(dto.ownerName !== undefined ? { ownerName: dto.ownerName } : {}),
        ...(dto.ownerSide !== undefined ? { ownerSide: dto.ownerSide } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
    await this.writeAudit({
      actorId,
      action: AuditAction.UPDATE,
      targetType: "ImplementationMilestone",
      targetId: record.id,
      clientId,
    });
    return record;
  }

  async deleteMilestone(
    clientId: string,
    id: string,
    actorId: string,
  ): Promise<{ success: boolean; id: string }> {
    await this.findMilestoneById(clientId, id);
    await this.prisma.implementationMilestone.delete({ where: { id } });
    await this.writeAudit({
      actorId,
      action: AuditAction.DELETE,
      targetType: "ImplementationMilestone",
      targetId: id,
      clientId,
    });
    return { success: true, id };
  }

  // =========================================================================
  // 5. ENGAGEMENT REPORTS
  // =========================================================================
  async uploadReport(
    clientId: string,
    dto: UploadEngagementReportDto,
    file: { originalname: string; buffer: Buffer; mimetype?: string },
    actorId: string,
  ): Promise<EngagementReportModel> {
    await this.assertClientAccount(clientId);
    const stored = await this.reportStorage.saveClientReport({
      clientId,
      originalName: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const record = await this.prisma.engagementReport.create({
      data: {
        clientId,
        title: dto.title,
        type: dto.type,
        period: dto.period,
        summary: dto.summary,
        fileKey: stored.fileKey,
        originalFileName: stored.originalFileName,
        contentType: stored.contentType,
        publishedAt: null,
      },
    });
    await this.writeAudit({
      actorId,
      action: AuditAction.CREATE,
      targetType: "EngagementReport",
      targetId: record.id,
      clientId,
    });
    return record;
  }

  async findReports(
    clientId: string,
    options: { publishedOnly?: boolean } = {},
  ): Promise<EngagementReportModel[]> {
    return this.prisma.engagementReport.findMany({
      where: {
        clientId,
        ...(options.publishedOnly ? { publishedAt: { not: null } } : {}),
      },
      orderBy: { publishedAt: "desc" },
    });
  }

  async findClientReports(clientId: string): Promise<ClientEngagementReport[]> {
    const rows = await this.findReports(clientId, { publishedOnly: true });
    return rows.map((row) => this.toClientReport(row));
  }

  async findReportById(
    clientId: string,
    id: string,
    options: { publishedOnly?: boolean } = {},
  ): Promise<EngagementReportModel> {
    const record = await this.prisma.engagementReport.findFirst({
      where: {
        id,
        clientId,
        ...(options.publishedOnly ? { publishedAt: { not: null } } : {}),
      },
    });
    if (!record) {
      throw new NotFoundException(`Report ${id} not found`);
    }
    return record;
  }

  async getClientReport(
    clientId: string,
    id: string,
  ): Promise<ClientEngagementReport> {
    const record = await this.findReportById(clientId, id, {
      publishedOnly: true,
    });
    return this.toClientReport(record);
  }

  async downloadClientReport(
    clientId: string,
    id: string,
    actorId: string,
  ): Promise<{
    stream: Readable;
    contentType: string;
    downloadName: string;
  }> {
    const record = await this.prisma.engagementReport.findUnique({
      where: { id },
    });
    if (!record || record.clientId !== clientId || !record.publishedAt) {
      if (record) {
        await this.writeAudit({
          actorId,
          action: AuditAction.ACCESS_DENY,
          targetType: "EngagementReport",
          targetId: record.id,
          clientId,
        });
      }
      throw new NotFoundException(`Report ${id} not found`);
    }
    const { stream } = this.reportStorage.openReadStream(record.fileKey);
    await this.writeAudit({
      actorId,
      action: AuditAction.DOWNLOAD,
      targetType: "EngagementReport",
      targetId: record.id,
      clientId,
    });
    return {
      stream,
      contentType: record.contentType || "application/octet-stream",
      downloadName: record.originalFileName || `report-${record.id}.bin`,
    };
  }

  async updateReport(
    clientId: string,
    id: string,
    dto: UpdateEngagementReportDto,
    actorId: string,
  ): Promise<EngagementReportModel> {
    await this.findReportById(clientId, id);
    const record = await this.prisma.engagementReport.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.period !== undefined ? { period: dto.period } : {}),
        ...(dto.summary !== undefined ? { summary: dto.summary } : {}),
      },
    });
    await this.writeAudit({
      actorId,
      action: AuditAction.UPDATE,
      targetType: "EngagementReport",
      targetId: record.id,
      clientId,
    });
    return record;
  }

  async publishReport(
    id: string,
    actorId: string,
  ): Promise<EngagementReportModel> {
    const existing = await this.prisma.engagementReport.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Report ${id} not found`);
    }
    if (existing.publishedAt) {
      return existing;
    }
    const record = await this.prisma.engagementReport.update({
      where: { id },
      data: { publishedAt: new Date() },
    });
    await this.writeAudit({
      actorId,
      action: AuditAction.PUBLISH,
      targetType: "EngagementReport",
      targetId: record.id,
      clientId: record.clientId,
    });
    return record;
  }

  async deleteReport(
    clientId: string,
    id: string,
    actorId: string,
  ): Promise<{ success: boolean; id: string }> {
    const existing = await this.findReportById(clientId, id);
    await this.prisma.engagementReport.delete({ where: { id } });
    await this.reportStorage.deleteIfExists(existing.fileKey);
    await this.writeAudit({
      actorId,
      action: AuditAction.DELETE,
      targetType: "EngagementReport",
      targetId: id,
      clientId,
    });
    return { success: true, id };
  }

  private toClientReport(row: EngagementReportModel): ClientEngagementReport {
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      period: row.period,
      publishedAt: row.publishedAt,
      summary: row.summary,
      originalFileName: row.originalFileName,
      contentType: row.contentType,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      canDownload: Boolean(row.fileKey && row.publishedAt),
    };
  }

  // =========================================================================
  // 6. AUDIT LOGS
  // =========================================================================
  async findAuditLogs(clientId?: string): Promise<AuditLogModel[]> {
    return this.audit.list({ clientId, take: 200 });
  }

  private async writeAudit(input: {
    actorId: string;
    action: AuditAction;
    targetType: AuditTargetType;
    targetId: string;
    clientId: string;
  }): Promise<void> {
    await this.audit.write(input);
  }
}
