import { ForbiddenException, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { AuditAction, Role, StaffPosition } from "../../generated/prisma/enums";
import type { AdminAuth } from "../interfaces/admin-auth.interface";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}

type AuthenticatedRequest = Request & { user?: AdminAuth };

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly audit: AuditService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.role === Role.SUPER_ADMIN) return true;

    if (request.user?.id) {
      await this.audit.write({
        actorId: request.user.id,
        action: AuditAction.ACCESS_DENY,
        targetType: "Permission",
        targetId: request.user.id,
        clientId: request.user.role === Role.USER ? request.user.id : null,
      });
    }
    throw new ForbiddenException("Super Admin access required");
  }
}

@Injectable()
export class ClientUserGuard implements CanActivate {
  constructor(private readonly audit: AuditService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.role === Role.USER) return true;

    if (request.user?.id) {
      await this.audit.write({
        actorId: request.user.id,
        action: AuditAction.ACCESS_DENY,
        targetType: "Permission",
        targetId: request.user.id,
      });
    }
    throw new ForbiddenException("Client access required");
  }
}

@Injectable()
export class RepOrAdminGuard implements CanActivate {
  constructor(private readonly audit: AuditService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.user?.role;
    if (role === Role.SUPER_ADMIN || role === Role.SALES_REPRESENTATIVE) {
      return true;
    }

    if (request.user?.id) {
      await this.audit.write({
        actorId: request.user.id,
        action: AuditAction.ACCESS_DENY,
        targetType: "Permission",
        targetId: request.user.id,
        clientId: role === Role.USER ? request.user.id : null,
      });
    }
    throw new ForbiddenException(
      "Representative or Super Admin access required",
    );
  }
}

/**
 * Allows only sales representatives whose position is EADS
 * (Executive Account Development Specialist).
 */
@Injectable()
export class EadsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (
      request.user?.role !== Role.SALES_REPRESENTATIVE ||
      request.user.position !==
        StaffPosition.EXECUTIVE_ACCOUNT_DEVELOPMENT_SPECIALIST
    ) {
      throw new ForbiddenException(
        "Executive Account Development Specialist access required",
      );
    }
    return true;
  }
}

/** @deprecated Use EadsGuard — kept as alias during A7 rename. */
export const AccountExecutiveGuard = EadsGuard;

/**
 * CRM (Doc A): Master Admin or any Sales Representative.
 * List/update scoping (own vs all) is enforced in LeadsService.
 */
@Injectable()
export class CrmStaffGuard implements CanActivate {
  constructor(private readonly audit: AuditService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.user?.role;
    if (role === Role.SUPER_ADMIN || role === Role.SALES_REPRESENTATIVE) {
      return true;
    }

    if (request.user?.id) {
      await this.audit.write({
        actorId: request.user.id,
        action: AuditAction.ACCESS_DENY,
        targetType: "Permission",
        targetId: request.user.id,
        clientId: role === Role.USER ? request.user.id : null,
      });
    }
    throw new ForbiddenException(
      "CRM access requires Master Admin or Sales Representative",
    );
  }
}
