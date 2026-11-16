import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuditAction } from "../../generated/prisma/enums";
import type { AuditLogModel } from "../../generated/prisma/models";

export type WriteAuditInput = {
  actorId: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  clientId?: string | null;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async write(input: WriteAuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: input.actorId,
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId,
          clientId: input.clientId ?? null,
        },
      });
    } catch (error) {
      // Audit must never block the primary request path.
      this.logger.error(
        `Failed to write audit ${input.action} ${input.targetType}/${input.targetId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async list(
    options: {
      clientId?: string;
      take?: number;
    } = {},
  ): Promise<AuditLogModel[]> {
    const take = Math.min(Math.max(options.take ?? 100, 1), 500);
    return this.prisma.auditLog.findMany({
      where: options.clientId ? { clientId: options.clientId } : {},
      orderBy: { at: "desc" },
      take,
    });
  }
}
