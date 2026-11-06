import { ForbiddenException, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { Role, StaffPosition } from "../../generated/prisma/enums";
import type { AdminAuth } from "../interfaces/admin-auth.interface";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}

type AuthenticatedRequest = Request & { user?: AdminAuth };

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException("Super Admin access required");
    }
    return true;
  }
}

/** Allows only sales representatives whose position is Account Executive. */
@Injectable()
export class AccountExecutiveGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (
      request.user?.role !== Role.SALES_REPRESENTATIVE ||
      request.user.position !== StaffPosition.ACCOUNT_EXECUTIVE
    ) {
      throw new ForbiddenException("Account Executive access required");
    }
    return true;
  }
}
