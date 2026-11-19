import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../database/prisma.service";
import {
  AssessmentInstanceStatus,
  AssessmentStatus,
  AuditAction,
  Role,
} from "../../generated/prisma/enums";
import { Prisma } from "../../generated/prisma/client";
import type { AssessmentInstanceModel } from "../../generated/prisma/models";
import {
  AssessmentScoringService,
  type ClientSafeResult,
  type RawAnswers,
} from "./assessment-scoring.service";

const ON_BEHALF_TOKEN_TTL_MS = 4 * 60 * 60 * 1000;

type InstanceWithAssessment = AssessmentInstanceModel & {
  assessment: {
    id: string;
    slug: string;
    title: string;
    status: AssessmentStatus;
    document: unknown;
  };
};

@Injectable()
export class AssessmentInstancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: AssessmentScoringService,
    private readonly audit: AuditService,
  ) {}

  async getClientAssessmentView(
    clientId: string,
    options: { slug?: string } = {},
  ) {
    const history = await this.listClientInstanceHistory(clientId);
    const requestedSlug = options.slug?.trim() || "";

    // History / prior results: load the client's instance by slug even if the
    // assessment was later archived (results must remain viewable).
    if (requestedSlug) {
      const scoped = await this.findInstanceForClientBySlug(
        clientId,
        requestedSlug,
      );
      if (scoped) {
        return { ...this.toClientPayload(scoped), history };
      }

      const published = await this.findPublishedAssessment(requestedSlug);
      return {
        instance: null,
        assessment: {
          id: published.id,
          slug: published.slug,
          title: published.title,
          document: this.scoring.toClientDocument(
            this.scoring.parseDocument(published.document),
          ),
        },
        result: null,
        history,
      };
    }

    const primary = await this.resolveClientFacingAssessment();
    const scoped = await this.findInstanceForClientBySlug(
      clientId,
      primary.slug,
    );
    if (scoped) {
      return { ...this.toClientPayload(scoped), history };
    }

    return {
      instance: null,
      assessment: {
        id: primary.id,
        slug: primary.slug,
        title: primary.title,
        document: this.scoring.toClientDocument(
          this.scoring.parseDocument(primary.document),
        ),
      },
      result: null,
      history,
    };
  }

  async startForClient(
    clientId: string,
    options: { assessmentId?: string; slug?: string } = {},
  ) {
    // Clients never self-start or retake — Admin / sales reps create
    // instances and complete them via the on-behalf Zoom flow.
    void clientId;
    void options;
    throw new ForbiddenException(
      "Clients cannot start assessments. An Admin or sales representative must complete the assessment on your behalf.",
    );
  }

  async submitForClient(
    clientId: string,
    instanceId: string,
    answers: RawAnswers,
  ) {
    void clientId;
    void instanceId;
    void answers;
    throw new ForbiddenException(
      "Clients cannot submit assessments. An Admin or sales representative must complete the assessment on your behalf.",
    );
  }

  /** Load one of the client's own instances (for results dashboard). */
  async getClientInstanceView(clientId: string, instanceId: string) {
    const instance = await this.requireClientInstance(clientId, instanceId);
    return this.toClientPayloadWithHistory(clientId, instance);
  }

  async createForClient(
    clientId: string,
    actorId: string,
    options: { assessmentId?: string; slug?: string } = {},
  ) {
    await this.assertClientAccount(clientId);
    const assessment = await this.resolvePublishedAssessment(options);
    try {
      const created = await this.prisma.assessmentInstance.create({
        data: {
          clientId,
          assessmentId: assessment.id,
          status: AssessmentInstanceStatus.PENDING,
        },
        include: { assessment: true },
      });
      await this.writeAudit({
        actorId,
        action: AuditAction.CREATE,
        targetId: created.id,
        clientId,
      });
      return this.toAdminInstance(created);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
      ) {
        throw new ConflictException(
          "An assessment instance already exists for this client",
        );
      }
      throw error;
    }
  }

  async issueOnBehalfToken(instanceId: string, actorId: string) {
    const instance = await this.prisma.assessmentInstance.findUnique({
      where: { id: instanceId },
      include: { assessment: true },
    });
    if (!instance) {
      throw new NotFoundException(
        `Assessment instance ${instanceId} not found`,
      );
    }
    if (instance.status === AssessmentInstanceStatus.COMPLETED) {
      throw new ConflictException("Assessment instance is already completed");
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = this.hashToken(token);
    const tokenExpiresAt = new Date(Date.now() + ON_BEHALF_TOKEN_TTL_MS);

    await this.prisma.assessmentInstance.update({
      where: { id: instance.id },
      data: {
        onBehalfTokenHash: tokenHash,
        tokenExpiresAt,
        status:
          instance.status === AssessmentInstanceStatus.PENDING
            ? AssessmentInstanceStatus.IN_PROGRESS
            : instance.status,
      },
    });

    await this.writeAudit({
      actorId,
      action: AuditAction.ON_BEHALF,
      targetId: instance.id,
      clientId: instance.clientId,
    });

    return {
      instanceId: instance.id,
      clientId: instance.clientId,
      token,
      expiresAt: tokenExpiresAt.toISOString(),
      /** Frontend Zoom completion page (rep or Super Admin session required). */
      path: `/on-behalf/${token}`,
      apiPath: `/api/v1/on-behalf/${token}`,
    };
  }

  async listForClient(clientId: string) {
    await this.assertClientAccount(clientId);
    const rows = await this.prisma.assessmentInstance.findMany({
      where: { clientId },
      include: { assessment: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.toAdminInstanceSummary(row));
  }

  async getAdminInstanceDetail(instanceId: string) {
    const instance = await this.prisma.assessmentInstance.findUnique({
      where: { id: instanceId },
      include: { assessment: true },
    });
    if (!instance) {
      throw new NotFoundException(
        `Assessment instance ${instanceId} not found`,
      );
    }

    const client = await this.prisma.adminUser.findUnique({
      where: { id: instance.clientId },
      select: { id: true, name: true, email: true },
    });
    if (!client) {
      throw new NotFoundException(`Client ${instance.clientId} not found`);
    }

    const result =
      instance.status === AssessmentInstanceStatus.COMPLETED
        ? (instance.result as ClientSafeResult | null)
        : null;

    return {
      ...this.toAdminInstanceSummary(instance),
      client,
      completedBy: instance.completedBy,
      onBehalfOf: instance.onBehalfOf,
      tokenExpiresAt: instance.tokenExpiresAt,
      hasActiveOnBehalfToken: Boolean(
        instance.onBehalfTokenHash &&
        instance.tokenExpiresAt &&
        instance.tokenExpiresAt.getTime() > Date.now(),
      ),
      result,
    };
  }

  async getOnBehalfView(token: string, actorId?: string) {
    const instance = await this.requireValidOnBehalfToken(token, actorId);
    return this.toClientPayload(instance);
  }

  async submitOnBehalf(token: string, actorId: string, answers: RawAnswers) {
    const instance = await this.requireValidOnBehalfToken(token, actorId);
    const completed = await this.completeInstance({
      instance,
      answers,
      actorId,
      onBehalfOf: instance.clientId,
    });

    await this.prisma.assessmentInstance.update({
      where: { id: instance.id },
      data: {
        onBehalfTokenHash: null,
        tokenExpiresAt: null,
      },
    });

    return completed;
  }

  async getDashboardAssessment(clientId: string) {
    const history = await this.listClientInstanceHistory(clientId);
    const facingSlug = await this.resolveClientFacingAssessment()
      .then((assessment) => assessment.slug)
      .catch(() => null);

    const primaryInstance = facingSlug
      ? await this.findInstanceForClientAssessment(clientId, {
          slug: facingSlug,
        })
      : null;

    if (!primaryInstance) {
      return { assessment: null, assessments: history };
    }

    const result = primaryInstance.result as ClientSafeResult | null;
    return {
      assessment: {
        instanceId: primaryInstance.id,
        assessmentId: primaryInstance.assessmentId,
        assessmentTitle: primaryInstance.assessment.title,
        assessmentSlug: primaryInstance.assessment.slug,
        status: primaryInstance.status,
        submittedAt: primaryInstance.submittedAt,
        result: result
          ? {
              overallScore: result.overallScore,
              sectionBreakdowns: result.sectionBreakdowns,
              reviewCount: result.review?.length ?? 0,
              allSame: result.allSame,
            }
          : null,
      },
      assessments: history,
    };
  }

  private async completeInstance(input: {
    instance: InstanceWithAssessment;
    answers: RawAnswers;
    actorId: string;
    onBehalfOf: string | null;
  }) {
    if (input.instance.status === AssessmentInstanceStatus.COMPLETED) {
      throw new ConflictException("Assessment instance is already completed");
    }

    const document = this.scoring.parseDocument(
      input.instance.assessment.document,
    );
    const result = this.scoring.scoreDocument(document, input.answers);

    const updated = await this.prisma.assessmentInstance.update({
      where: { id: input.instance.id },
      data: {
        status: AssessmentInstanceStatus.COMPLETED,
        answers: input.answers as Prisma.InputJsonValue,
        result: result as Prisma.InputJsonValue,
        completedBy: input.actorId,
        onBehalfOf: input.onBehalfOf,
        submittedAt: new Date(),
        onBehalfTokenHash: null,
        tokenExpiresAt: null,
      },
      include: { assessment: true },
    });

    await this.writeAudit({
      actorId: input.actorId,
      action: AuditAction.COMPLETE,
      targetId: updated.id,
      clientId: updated.clientId,
    });

    return this.toClientPayload(updated);
  }

  private async findLatestForClient(
    clientId: string,
  ): Promise<InstanceWithAssessment | null> {
    return this.prisma.assessmentInstance.findFirst({
      where: { clientId },
      include: { assessment: true },
      orderBy: { createdAt: "desc" },
    });
  }

  private async findPreferredOpenForClient(
    clientId: string,
  ): Promise<InstanceWithAssessment | null> {
    return this.prisma.assessmentInstance.findFirst({
      where: {
        clientId,
        status: {
          in: [
            AssessmentInstanceStatus.IN_PROGRESS,
            AssessmentInstanceStatus.PENDING,
          ],
        },
      },
      include: { assessment: true },
      orderBy: { createdAt: "desc" },
    });
  }

  private async findInstanceForClientAssessment(
    clientId: string,
    options: { slug: string },
  ): Promise<InstanceWithAssessment | null> {
    return this.findInstanceForClientBySlug(clientId, options.slug);
  }

  /** Instance for this client + assessment slug (any assessment status). */
  private async findInstanceForClientBySlug(
    clientId: string,
    slug: string,
  ): Promise<InstanceWithAssessment | null> {
    return this.prisma.assessmentInstance.findFirst({
      where: {
        clientId,
        assessment: { slug },
      },
      include: { assessment: true },
      orderBy: { createdAt: "desc" },
    });
  }

  private async listClientInstanceHistory(clientId: string) {
    const rows = await this.prisma.assessmentInstance.findMany({
      where: { clientId },
      include: {
        assessment: { select: { id: true, slug: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => {
      const result =
        row.status === AssessmentInstanceStatus.COMPLETED
          ? (row.result as ClientSafeResult | null)
          : null;
      return {
        instanceId: row.id,
        assessmentId: row.assessmentId,
        assessmentSlug: row.assessment.slug,
        assessmentTitle: row.assessment.title,
        status: row.status,
        submittedAt: row.submittedAt,
        createdAt: row.createdAt,
        overallScore: result?.overallScore ?? null,
      };
    });
  }

  private async requireClientInstance(
    clientId: string,
    instanceId: string,
  ): Promise<InstanceWithAssessment> {
    const instance = await this.prisma.assessmentInstance.findFirst({
      where: { id: instanceId, clientId },
      include: { assessment: true },
    });
    if (!instance) {
      throw new NotFoundException(
        `Assessment instance ${instanceId} not found`,
      );
    }
    return instance;
  }

  private async requireValidOnBehalfToken(
    token: string,
    actorId?: string,
  ): Promise<InstanceWithAssessment> {
    const deny = async (targetId?: string, clientId?: string | null) => {
      if (actorId && targetId) {
        await this.writeAudit({
          actorId,
          action: AuditAction.ACCESS_DENY,
          targetId,
          clientId: clientId ?? null,
        });
      }
      throw new ForbiddenException("Invalid or expired on-behalf token");
    };

    if (!token || token.length < 20) {
      throw new ForbiddenException("Invalid or expired on-behalf token");
    }
    const tokenHash = this.hashToken(token);
    const instance = await this.prisma.assessmentInstance.findFirst({
      where: { onBehalfTokenHash: tokenHash },
      include: { assessment: true },
    });
    if (!instance || !instance.tokenExpiresAt) {
      throw new ForbiddenException("Invalid or expired on-behalf token");
    }
    if (instance.tokenExpiresAt.getTime() < Date.now()) {
      await deny(instance.id, instance.clientId);
    }
    if (instance.status === AssessmentInstanceStatus.COMPLETED) {
      throw new ConflictException("Assessment instance is already completed");
    }
    return instance;
  }

  private async resolvePublishedAssessment(options: {
    assessmentId?: string;
    slug?: string;
  }) {
    if (options.assessmentId) {
      const assessment = await this.prisma.assessment.findFirst({
        where: {
          id: options.assessmentId,
          status: AssessmentStatus.PUBLISHED,
        },
      });
      if (!assessment) {
        throw new NotFoundException("Published assessment not found");
      }
      return assessment;
    }
    return this.resolveClientFacingAssessment(
      options.slug?.trim() ? { slug: options.slug.trim() } : {},
    );
  }

  /**
   * Client-facing assessment: explicit slug if provided, else isClientPrimary.
   * No silent fallback — admin may leave every toggle OFF.
   */
  private async resolveClientFacingAssessment(options: { slug?: string } = {}) {
    if (options.slug) {
      return this.findPublishedAssessment(options.slug);
    }

    const primary = await this.prisma.assessment.findFirst({
      where: {
        isClientPrimary: true,
        status: AssessmentStatus.PUBLISHED,
      },
    });
    if (primary) return primary;

    throw new NotFoundException(
      "No client-facing assessment is assigned. Ask the Super Admin to set a primary assessment.",
    );
  }

  private async findPublishedAssessment(slug: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { slug, status: AssessmentStatus.PUBLISHED },
    });
    if (!assessment) {
      throw new NotFoundException(
        `Published assessment "${slug}" was not found`,
      );
    }
    return assessment;
  }

  private async assertClientAccount(clientId: string): Promise<void> {
    const account = await this.prisma.adminUser.findUnique({
      where: { id: clientId },
      select: { id: true, role: true, isActive: true },
    });
    if (!account || account.role !== Role.USER || !account.isActive) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }
  }

  private toClientPayload(instance: InstanceWithAssessment) {
    const document = this.scoring.toClientDocument(
      this.scoring.parseDocument(instance.assessment.document),
    );
    const result =
      instance.status === AssessmentInstanceStatus.COMPLETED
        ? (instance.result as ClientSafeResult | null)
        : null;

    return {
      instance: {
        id: instance.id,
        status: instance.status,
        submittedAt: instance.submittedAt,
        completedBy: instance.completedBy,
        onBehalfOf: instance.onBehalfOf,
      },
      assessment: {
        id: instance.assessment.id,
        slug: instance.assessment.slug,
        title: instance.assessment.title,
        document,
      },
      result,
    };
  }

  private async toClientPayloadWithHistory(
    clientId: string,
    instance: InstanceWithAssessment,
  ) {
    const history = await this.listClientInstanceHistory(clientId);
    return { ...this.toClientPayload(instance), history };
  }

  private toAdminInstance(instance: InstanceWithAssessment) {
    return this.toAdminInstanceSummary(instance);
  }

  private toAdminInstanceSummary(instance: InstanceWithAssessment) {
    return {
      id: instance.id,
      clientId: instance.clientId,
      assessmentId: instance.assessmentId,
      status: instance.status,
      submittedAt: instance.submittedAt,
      createdAt: instance.createdAt,
      completedBy: instance.completedBy,
      onBehalfOf: instance.onBehalfOf,
      assessment: {
        id: instance.assessment.id,
        slug: instance.assessment.slug,
        title: instance.assessment.title,
      },
    };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async writeAudit(input: {
    actorId: string;
    action: AuditAction;
    targetId: string;
    clientId: string | null;
  }): Promise<void> {
    await this.audit.write({
      actorId: input.actorId,
      action: input.action,
      targetType: "AssessmentInstance",
      targetId: input.targetId,
      clientId: input.clientId,
    });
  }
}
