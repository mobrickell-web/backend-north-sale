import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";
import ms, { type StringValue } from "ms";
import type { AdminAuth } from "../../common/interfaces/admin-auth.interface";
import type { JwtPayload } from "../../common/interfaces/jwt-payload.interface";
import { PrismaService } from "../../database/prisma.service";

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  refreshExpiresIn: number;
  admin: AdminAuth;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly accessExpiresIn: StringValue;
  private readonly refreshExpiresIn: StringValue;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    config: ConfigService,
  ) {
    this.accessExpiresIn = (config.get<string>("jwt.expiresIn") ??
      "15m") as StringValue;
    this.refreshExpiresIn = (config.get<string>("jwt.refreshExpiresIn") ??
      "7d") as StringValue;
  }

  async validateAdmin(
    email: string,
    password: string,
    ip?: string,
  ): Promise<AdminAuth> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!admin) {
      this.logFailedAttempt(email, ip);
      throw new UnauthorizedException("Invalid credentials");
    }

    const validPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!validPassword || !admin.isActive) {
      this.logFailedAttempt(email, ip);
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };
  }

  async login(admin: AdminAuth): Promise<LoginResult> {
    const refreshToken = this.generateRefreshToken();
    await this.prisma.adminRefreshToken.create({
      data: {
        adminId: admin.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + ms(this.refreshExpiresIn)),
      },
    });
    return this.buildLoginResult(admin, refreshToken);
  }

  async refresh(refreshToken: string, ip?: string): Promise<LoginResult> {
    const record = await this.prisma.adminRefreshToken.findUnique({
      where: { tokenHash: this.hashToken(refreshToken) },
      include: { admin: true },
    });

    if (!record) {
      this.logIssued(refreshToken, ip, "refresh attempt with unknown token");
      throw new UnauthorizedException("Invalid refresh token");
    }

    const now = new Date();

    if (record.revokedAt) {
      this.revokeAllForAdmin(
        record.adminId,
        `reused revoked token ${record.id}`,
      );
      this.logIssued(
        refreshToken,
        ip,
        `reused revoked token ${record.id} — all tokens revoked`,
      );
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (record.expiresAt <= now) {
      await this.prisma.adminRefreshToken.update({
        where: { id: record.id },
        data: { revokedAt: now },
      });
      this.logIssued(refreshToken, ip, "expired refresh token");
      throw new UnauthorizedException("Invalid refresh token");
    }

    const admin = record.admin;
    if (!admin.isActive) {
      await this.prisma.adminRefreshToken.update({
        where: { id: record.id },
        data: { revokedAt: now },
      });
      throw new UnauthorizedException("Admin account is inactive");
    }

    const rotated = this.generateRefreshToken();
    const rotatedRecord = await this.prisma.adminRefreshToken.create({
      data: {
        adminId: admin.id,
        tokenHash: this.hashToken(rotated),
        expiresAt: new Date(Date.now() + ms(this.refreshExpiresIn)),
      },
    });

    await this.prisma.adminRefreshToken.update({
      where: { id: record.id },
      data: { revokedAt: now, replacedById: rotatedRecord.id },
    });

    return this.buildLoginResult(admin, rotated);
  }

  async logout(
    refreshToken: string,
    adminId: string,
  ): Promise<{ revoked: boolean }> {
    const record = await this.prisma.adminRefreshToken.findUnique({
      where: { tokenHash: this.hashToken(refreshToken) },
    });
    if (!record || record.adminId !== adminId || record.revokedAt) {
      return { revoked: false };
    }
    await this.prisma.adminRefreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }

  async getMe(adminId: string): Promise<AdminAuth> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException("Admin not found or inactive");
    }
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };
  }

  private buildLoginResult(
    admin: AdminAuth,
    refreshToken: string,
  ): LoginResult {
    const payload: JwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken,
      tokenType: "Bearer",
      expiresIn: ms(this.accessExpiresIn) / 1000,
      refreshExpiresIn: ms(this.refreshExpiresIn) / 1000,
      admin,
    };
  }

  private generateRefreshToken(): string {
    return randomBytes(48).toString("base64url");
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async revokeAllForAdmin(
    adminId: string,
    reason: string,
  ): Promise<void> {
    await this.prisma.adminRefreshToken.updateMany({
      where: { adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    this.logger.warn(
      `All refresh tokens revoked for admin ${adminId}: ${reason}`,
    );
  }

  private logIssued(token: string, ip?: string, detail?: string): void {
    const suffix = detail ? ` — ${detail}` : "";
    this.logger.warn(
      `Refresh token rejected from ${ip ?? "unknown ip"}${suffix}`,
    );
  }

  private logFailedAttempt(email: string, ip?: string): void {
    this.logger.warn(
      `Failed login attempt for "${email}" from ${ip ?? "unknown ip"}`,
    );
  }
}
