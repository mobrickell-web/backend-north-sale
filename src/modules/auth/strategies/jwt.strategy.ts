import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AdminAuth } from "../../../common/interfaces/admin-auth.interface";
import type { JwtPayload } from "../../../common/interfaces/jwt-payload.interface";
import { PrismaService } from "../../../database/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("jwt.secret"),
    });
  }

  async validate(payload: JwtPayload): Promise<AdminAuth> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
    });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException("Invalid or inactive admin session");
    }
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };
  }
}
