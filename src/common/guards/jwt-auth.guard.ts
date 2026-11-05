import { ForbiddenException, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { Role } from "../../generated/prisma/enums";
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
