import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import type { AdminAuth } from "../../../common/interfaces/admin-auth.interface";
import type { JwtPayload } from "../../../common/interfaces/jwt-payload.interface";
import { PrismaService } from "../../../database/prisma.service";
import { ClientAccessStatus, Role } from "../../../generated/prisma/enums";

const ACCESS_COOKIE_NAME = "north_admin_access_token";

function accessTokenFromCookie(request: Request): string | null {
  const prefix = `${ACCESS_COOKIE_NAME}=`;
  const cookie = request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return cookie?.slice(prefix.length) || null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        accessTokenFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("jwt.secret"),
    });
  }

  async validate(payload: JwtPayload): Promise<AdminAuth> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
    });
    if (!admin || !admin.isActive || !admin.emailVerifiedAt) {
      throw new UnauthorizedException("Invalid or inactive admin session");
    }
    const session = await this.prisma.adminRefreshToken.findUnique({
      where: { id: payload.sid },
      select: { adminId: true, expiresAt: true, revokedAt: true },
    });
    if (
      !session ||
      session.adminId !== admin.id ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException("Invalid or revoked admin session");
    }
    if (admin.role === Role.USER) {
      const request = await this.prisma.clientAccessRequest.findUnique({
        where: { accountId: admin.id },
        select: { status: true },
      });
      if (request?.status !== ClientAccessStatus.APPROVED) {
        throw new UnauthorizedException("Client access is not approved");
      }
    }
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };
  }
}
