import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AssessmentScoringService } from "./assessment-scoring.service";

/** Published assessment with client-safe document (no scoring internals). */
export type PublishedAssessmentClientEdition = {
  id: string;
  slug: string;
  title: string;
  status: string;
  document: ReturnType<AssessmentScoringService["toClientDocument"]>;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: AssessmentScoringService,
  ) {}

  /**
   * Published lookup for the private website lead-gen page.
   * Status filter is server-side; document is stripped to the client edition
   * so scoring internals / authoring extras never leave the API.
   */
  async findPublishedBySlug(
    slug: string,
  ): Promise<PublishedAssessmentClientEdition> {
    const assessment = await this.prisma.assessment.findFirst({
      where: { slug, status: "PUBLISHED" },
    });
    if (!assessment) {
      throw new NotFoundException("Assessment not found");
    }
    return this.toClientEdition(assessment);
  }

  /**
   * Same assessment clients get: the published isClientPrimary row only.
   * When none is assigned, returns 404 (admin may leave all toggles OFF).
   */
  async findClientFacingPublished(): Promise<PublishedAssessmentClientEdition> {
    const primary = await this.prisma.assessment.findFirst({
      where: { isClientPrimary: true, status: "PUBLISHED" },
    });
    if (primary) {
      return this.toClientEdition(primary);
    }

    throw new NotFoundException(
      "No client-facing assessment is assigned. Ask the Super Admin to set a primary assessment.",
    );
  }

  private toClientEdition(assessment: {
    id: string;
    slug: string;
    title: string;
    status: string;
    document: unknown;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): PublishedAssessmentClientEdition {
    const document = this.scoring.toClientDocument(
      this.scoring.parseDocument(assessment.document),
    );

    return {
      id: assessment.id,
      slug: assessment.slug,
      title: assessment.title,
      status: assessment.status,
      document,
      publishedAt: assessment.publishedAt,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt,
    };
  }
}
