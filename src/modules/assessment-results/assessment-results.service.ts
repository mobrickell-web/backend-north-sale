import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AdminAuth } from "../../common/interfaces/admin-auth.interface";
import { PrismaService } from "../../database/prisma.service";
import { Prisma } from "../../generated/prisma/client";
import { Role } from "../../generated/prisma/enums";
import { AuthService, type LoginResult } from "../auth/auth.service";
import type { ClaimAssessmentResultDto } from "./dto/claim-assessment-result.dto";
import type { CreateAssessmentResultDto } from "./dto/create-assessment-result.dto";

const SUMMARY_SELECT = {
  id: true,
  assessment: true,
  firstName: true,
  email: true,
  overallScore: true,
  maxScore: true,
  createdAt: true,
} as const;

@Injectable()
export class AssessmentResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async create(
    user: AdminAuth,
    dto: CreateAssessmentResultDto,
  ): Promise<{ id: string }> {
    const firstName = dto.firstName.trim();
    if (!firstName) {
      throw new BadRequestException("First name is required");
    }
    if (dto.maxScore < dto.overallScore) {
      throw new BadRequestException(
        "maxScore must be greater than or equal to overallScore",
      );
    }

    return this.prisma.assessmentResult.create({
      data: {
        assessment: dto.assessment,
        firstName,
        email: this.normalizeEmail(dto.email),
        overallScore: dto.overallScore,
        maxScore: dto.maxScore,
        answers: dto.answers as Prisma.InputJsonObject,
        result: dto.result as Prisma.InputJsonObject,
        submittedById: user.id,
      },
      select: { id: true },
    });
  }

  /**
   * Public free assessment: provision/approve client, store results, issue session.
   */
  async claim(
    dto: ClaimAssessmentResultDto,
  ): Promise<{ id: string; session: LoginResult }> {
    const firstName = dto.firstName.trim();
    if (!firstName) {
      throw new BadRequestException("First name is required");
    }
    if (dto.maxScore < dto.overallScore) {
      throw new BadRequestException(
        "maxScore must be greater than or equal to overallScore",
      );
    }

    const account = await this.auth.upsertApprovedClientFromAssessment({
      name: firstName,
      email: dto.email,
      password: dto.password,
    });

    const created = await this.prisma.assessmentResult.create({
      data: {
        assessment: dto.assessment,
        firstName,
        email: this.normalizeEmail(dto.email),
        overallScore: dto.overallScore,
        maxScore: dto.maxScore,
        answers: dto.answers as Prisma.InputJsonObject,
        result: dto.result as Prisma.InputJsonObject,
        submittedById: account.id,
      },
      select: { id: true },
    });

    const session = await this.auth.login(account);
    return { id: created.id, session };
  }

  listMine(user: AdminAuth) {
    return this.prisma.assessmentResult.findMany({
      where: {
        OR: [
          { email: this.normalizeEmail(user.email) },
          { submittedById: user.id },
        ],
      },
      select: SUMMARY_SELECT,
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(user: AdminAuth, id: string) {
    const record = await this.prisma.assessmentResult.findUnique({
      where: { id },
      select: {
        ...SUMMARY_SELECT,
        answers: true,
        result: true,
        submittedById: true,
      },
    });
    const allowed =
      record &&
      (user.role === Role.SUPER_ADMIN ||
        record.submittedById === user.id ||
        record.email === this.normalizeEmail(user.email));
    if (!record || !allowed) {
      throw new NotFoundException("Assessment result not found");
    }

    return {
      id: record.id,
      assessment: record.assessment,
      firstName: record.firstName,
      email: record.email,
      overallScore: record.overallScore,
      maxScore: record.maxScore,
      answers: record.answers,
      result: record.result,
      createdAt: record.createdAt,
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
