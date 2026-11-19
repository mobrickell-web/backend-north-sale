import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../../common/audit/audit.service";
import { Prisma } from "../../../generated/prisma/client";
import {
  AuditAction,
  type AssessmentStatus,
} from "../../../generated/prisma/enums";
import type { AssessmentModel } from "../../../generated/prisma/models";
import { PrismaService } from "../../../database/prisma.service";
import {
  AdminAssessmentQueryDto,
  AssessmentStatusUpdateDto,
  CreateAssessmentDto,
  UpdateAssessmentDto,
} from "./dto/admin-assessment.dto";

@Injectable()
export class AdminAssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateAssessmentDto): Promise<AssessmentModel> {
    const status = (dto.status ?? "DRAFT") as AssessmentStatus;
    try {
      let isClientPrimary = false;
      if (status === "PUBLISHED") {
        const existingPrimary = await this.prisma.assessment.count({
          where: { isClientPrimary: true },
        });
        isClientPrimary = existingPrimary === 0;
      }
      return await this.prisma.assessment.create({
        data: {
          slug: dto.slug.trim(),
          title: dto.title.trim(),
          status,
          document: dto.document as unknown as Prisma.InputJsonValue,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
          isClientPrimary,
        },
      });
    } catch (error) {
      throw this.normalizeWriteError(error);
    }
  }

  async list(query: AdminAssessmentQueryDto) {
    const where = this.buildWhere(query);
    const skip = query.skip ?? 0;
    const take = query.take ?? 100;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.assessment.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        skip,
        take,
      }),
      this.prisma.assessment.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  async detail(id: string): Promise<AssessmentModel> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
    });
    if (!assessment) {
      throw new NotFoundException("Assessment not found");
    }
    return assessment;
  }

  async update(id: string, dto: UpdateAssessmentDto): Promise<AssessmentModel> {
    await this.detail(id);

    const data: Prisma.AssessmentUpdateInput = {};
    if (dto.slug !== undefined) data.slug = dto.slug.trim();
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.document !== undefined) {
      data.document = dto.document as unknown as Prisma.InputJsonValue;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("No changes supplied");
    }

    try {
      return await this.prisma.assessment.update({ where: { id }, data });
    } catch (error) {
      throw this.normalizeWriteError(error);
    }
  }

  async changeStatus(
    id: string,
    dto: AssessmentStatusUpdateDto,
    actorId: string,
  ): Promise<AssessmentModel> {
    const assessment = await this.detail(id);
    const nextStatus = dto.status as AssessmentStatus;

    if (assessment.status === nextStatus) {
      throw new BadRequestException("Assessment is already in this status");
    }

    let becomePrimary = false;
    if (nextStatus === "PUBLISHED" && !assessment.isClientPrimary) {
      const existingPrimary = await this.prisma.assessment.count({
        where: { isClientPrimary: true },
      });
      // First published assessment (or any publish when none is primary)
      // becomes the default Primary shown on client dashboards.
      becomePrimary = existingPrimary === 0;
    }

    const updated = await this.prisma.assessment.update({
      where: { id },
      data: {
        status: nextStatus,
        // Draft/archived assessments cannot stay as the client-facing primary.
        isClientPrimary:
          nextStatus === "PUBLISHED"
            ? assessment.isClientPrimary || becomePrimary
            : false,
        publishedAt:
          nextStatus === "PUBLISHED"
            ? (assessment.publishedAt ?? new Date())
            : nextStatus === "DRAFT"
              ? null
              : assessment.publishedAt,
      },
    });

    if (nextStatus === "PUBLISHED") {
      await this.audit.write({
        actorId,
        action: AuditAction.PUBLISH,
        targetType: "Assessment",
        targetId: updated.id,
      });
    } else {
      await this.audit.write({
        actorId,
        action: AuditAction.UPDATE,
        targetType: "Assessment",
        targetId: updated.id,
      });

      // If we unpublish the Primary, promote the oldest remaining published
      // assessment so clients always have a default.
      if (assessment.isClientPrimary) {
        const fallback = await this.prisma.assessment.findFirst({
          where: { status: "PUBLISHED", id: { not: id } },
          orderBy: [{ publishedAt: "asc" }, { createdAt: "asc" }],
        });
        if (fallback) {
          await this.prisma.assessment.update({
            where: { id: fallback.id },
            data: { isClientPrimary: true },
          });
        }
      }
    }

    return updated;
  }

  /**
   * Client-facing primary toggle.
   * - enabled=true: this published assessment becomes the only primary
   * - enabled=false: clears primary (no client-facing assessment)
   */
  async setClientPrimary(
    id: string,
    actorId: string,
    enabled = true,
  ): Promise<AssessmentModel> {
    const assessment = await this.detail(id);
    if (assessment.status !== "PUBLISHED") {
      throw new BadRequestException(
        "Only a published assessment can be set as the client-facing assessment",
      );
    }

    if (!enabled) {
      const updated = await this.prisma.assessment.update({
        where: { id },
        data: { isClientPrimary: false },
      });
      await this.audit.write({
        actorId,
        action: AuditAction.UPDATE,
        targetType: "Assessment",
        targetId: updated.id,
      });
      return updated;
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.assessment.updateMany({
        where: { isClientPrimary: true, id: { not: id } },
        data: { isClientPrimary: false },
      }),
      this.prisma.assessment.update({
        where: { id },
        data: { isClientPrimary: true },
      }),
    ]);

    await this.audit.write({
      actorId,
      action: AuditAction.UPDATE,
      targetType: "Assessment",
      targetId: updated.id,
    });

    return updated;
  }

  async remove(
    id: string,
  ): Promise<{ deleted: boolean; id: string; slug: string }> {
    const assessment = await this.detail(id);

    const instanceCount = await this.prisma.assessmentInstance.count({
      where: { assessmentId: id },
    });
    if (instanceCount > 0) {
      throw new ConflictException(
        "Assessment has instances and cannot be deleted",
      );
    }

    try {
      await this.prisma.assessment.delete({ where: { id } });
    } catch (error) {
      // Race: an instance may have been created between the count and delete.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new ConflictException(
          "Assessment has instances and cannot be deleted",
        );
      }
      throw error;
    }

    return { deleted: true, id, slug: assessment.slug };
  }

  private buildWhere(
    query: AdminAssessmentQueryDto,
  ): Prisma.AssessmentWhereInput {
    const where: Prisma.AssessmentWhereInput = {};

    if (query.status) {
      where.status = query.status as AssessmentStatus;
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { slug: { contains: term, mode: "insensitive" } },
      ];
    }

    return where;
  }

  private normalizeWriteError(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return new ConflictException(
        "An assessment with this slug already exists",
      );
    }
    return error;
  }
}
