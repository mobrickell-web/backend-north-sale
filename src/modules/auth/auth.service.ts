import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import ms, { type StringValue } from "ms";
import type { AdminAuth } from "../../common/interfaces/admin-auth.interface";
import type { JwtPayload } from "../../common/interfaces/jwt-payload.interface";
import { PrismaService } from "../../database/prisma.service";
import {
  AuthCodePurpose,
  ClientAccessStatus,
  OAuthProvider,
  Role,
} from "../../generated/prisma/enums";
import { Prisma } from "../../generated/prisma/client";
import { MailService } from "../mail/mail.service";
import type { ResendCodeDto, VerifyCodeDto } from "./dto/email-auth.dto";
import type { SignupDto } from "./dto/signup.dto";
import type { UpdatePasswordDto } from "./dto/update-password.dto";
import type { CreateRepresentativeDto } from "./dto/create-representative.dto";

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  refreshExpiresIn: number;
  admin: AdminAuth;
}

const GENERIC_AUTH_MESSAGE =
  "If the account is eligible, a verification code will be sent.";
const GENERIC_SIGNUP_RESEND_MESSAGE =
  "If signup is still awaiting email verification, a code will be sent. If your email is already verified, no new email is needed.";
const SIGNUP_SUCCESS_MESSAGE =
  "Verification code sent to your email. Please verify to activate your account.";
const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_RESEND_INTERVAL_MS = 60 * 1000;
const CODE_MAX_ATTEMPTS = 5;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly accessExpiresIn: StringValue;
  private readonly refreshExpiresIn: StringValue;
  private readonly authCodeSecret: string;
  private readonly googleClientId?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    config: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.accessExpiresIn = (config.get<string>("jwt.expiresIn") ??
      "15m") as StringValue;
    this.refreshExpiresIn = (config.get<string>("jwt.refreshExpiresIn") ??
      "7d") as StringValue;
    this.authCodeSecret = config.getOrThrow<string>("jwt.secret");
    this.googleClientId = config.get<string>("google.clientId");
  }

  async signup(dto: SignupDto): Promise<{ message: string }> {
    this.assertPasswordLength(dto.password);
    if (!dto.name.trim()) {
      throw new BadRequestException("Name is required");
    }
    const email = this.normalizeEmail(dto.email);
    const existing = await this.prisma.adminUser.findUnique({
      where: { email },
    });

    if (existing) {
      if (
        existing.role === Role.USER &&
        existing.isActive &&
        !existing.emailVerifiedAt
      ) {
        await this.sendVerificationCode(
          existing.id,
          email,
          AuthCodePurpose.SIGNUP,
        );
      }
      return { message: SIGNUP_SUCCESS_MESSAGE };
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    let account;
    try {
      account = await this.prisma.adminUser.create({
        data: {
          name: dto.name.trim(),
          email,
          passwordHash,
          role: Role.USER,
          emailVerifiedAt: null,
          clientAccessRequest: { create: {} },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { message: SIGNUP_SUCCESS_MESSAGE };
      }
      throw error;
    }

    await this.sendVerificationCode(account.id, email, AuthCodePurpose.SIGNUP);
    return { message: SIGNUP_SUCCESS_MESSAGE };
  }

  async resendCode(
    dto: ResendCodeDto,
  ): Promise<{ message: string; retryAfterSeconds?: number }> {
    const email = this.normalizeEmail(dto.email);
    const account = await this.prisma.adminUser.findUnique({
      where: { email },
    });
    if (
      !account ||
      !account.isActive ||
      !this.isSupportedLoginRole(account.role)
    ) {
      return {
        message:
          dto.purpose === AuthCodePurpose.SIGNUP
            ? GENERIC_SIGNUP_RESEND_MESSAGE
            : GENERIC_AUTH_MESSAGE,
      };
    }
    if (
      dto.purpose === AuthCodePurpose.SIGNUP &&
      (account.role !== Role.USER || account.emailVerifiedAt)
    ) {
      return {
        message:
          account.role === Role.USER && account.emailVerifiedAt
            ? GENERIC_SIGNUP_RESEND_MESSAGE
            : GENERIC_AUTH_MESSAGE,
      };
    }
    const delivery = await this.sendVerificationCode(
      account.id,
      email,
      dto.purpose,
    );
    if (!delivery.sent && dto.purpose === AuthCodePurpose.SIGNUP) {
      throw new HttpException(
        `A recent code is still valid. Wait ${delivery.retryAfterSeconds} seconds before requesting another.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return {
      message:
        dto.purpose === AuthCodePurpose.SIGNUP
          ? "The email provider accepted a new verification-code email. Check your inbox and spam folder."
          : GENERIC_AUTH_MESSAGE,
      ...(dto.purpose === AuthCodePurpose.SIGNUP
        ? { retryAfterSeconds: delivery.retryAfterSeconds }
        : {}),
    };
  }

  async forgotPassword(emailInput: string): Promise<{ message: string }> {
    const email = this.normalizeEmail(emailInput);
    const account = await this.prisma.adminUser.findUnique({
      where: { email },
    });
    if (account?.isActive && this.isSupportedLoginRole(account.role)) {
      await this.sendVerificationCode(
        account.id,
        email,
        AuthCodePurpose.PASSWORD_RESET,
      );
    }
    return { message: GENERIC_AUTH_MESSAGE };
  }

  async verifyCode(dto: VerifyCodeDto): Promise<{
    verified: true;
    alreadyVerified?: true;
    resetToken?: string;
    message: string;
  }> {
    const email = this.normalizeEmail(dto.email);
    const account = await this.prisma.adminUser.findUnique({
      where: { email },
    });
    if (
      !account ||
      !account.isActive ||
      !this.isSupportedLoginRole(account.role)
    ) {
      throw new UnauthorizedException("Invalid or expired verification code");
    }
    if (dto.purpose === AuthCodePurpose.SIGNUP && account.role !== Role.USER) {
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    const now = new Date();
    if (dto.purpose === AuthCodePurpose.SIGNUP && account.emailVerifiedAt) {
      const previousChallenge =
        await this.prisma.authVerificationCode.findFirst({
          where: {
            accountId: account.id,
            purpose: AuthCodePurpose.SIGNUP,
            consumedAt: { not: null },
            attemptCount: { lt: CODE_MAX_ATTEMPTS },
          },
          orderBy: { createdAt: "desc" },
        });
      if (
        previousChallenge &&
        this.constantTimeEqual(
          previousChallenge.codeHash,
          this.hashCode(account.id, dto.purpose, dto.code),
        )
      ) {
        return {
          verified: true,
          alreadyVerified: true,
          message:
            "Your email is already verified. Your client access request is waiting for Super Admin approval.",
        };
      }
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    const challenge = await this.prisma.authVerificationCode.findFirst({
      where: {
        accountId: account.id,
        purpose: dto.purpose,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge) {
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    const expectedHash = this.hashCode(account.id, dto.purpose, dto.code);
    if (!this.constantTimeEqual(challenge.codeHash, expectedHash)) {
      const attempts = challenge.attemptCount + 1;
      await this.prisma.authVerificationCode.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          attemptCount: { lt: challenge.maxAttempts },
        },
        data: {
          attemptCount: { increment: 1 },
          ...(attempts >= challenge.maxAttempts ? { consumedAt: now } : {}),
        },
      });
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    const resetToken =
      dto.purpose === AuthCodePurpose.PASSWORD_RESET
        ? randomBytes(32).toString("base64url")
        : undefined;
    await this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.authVerificationCode.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          attemptCount: { lt: challenge.maxAttempts },
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) {
        throw new UnauthorizedException("Invalid or expired verification code");
      }

      if (dto.purpose === AuthCodePurpose.SIGNUP) {
        await transaction.adminUser.update({
          where: { id: account.id },
          data: { emailVerifiedAt: now },
        });
      } else if (resetToken) {
        await transaction.passwordResetToken.updateMany({
          where: { accountId: account.id, consumedAt: null },
          data: { consumedAt: now },
        });
        await transaction.passwordResetToken.create({
          data: {
            accountId: account.id,
            tokenHash: this.hashToken(resetToken),
            expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
          },
        });
      }
    });

    return {
      verified: true,
      ...(resetToken ? { resetToken } : {}),
      message:
        dto.purpose === AuthCodePurpose.SIGNUP
          ? "Email verified successfully. Your account is now active."
          : "Code verified. Use the reset token to set a new password.",
    };
  }

  async updatePassword(
    dto: UpdatePasswordDto,
  ): Promise<{ passwordUpdated: true }> {
    this.assertPasswordLength(dto.newPassword);
    const tokenHash = this.hashToken(dto.resetToken);
    const now = new Date();
    const reset = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!reset || reset.consumedAt || reset.expiresAt <= now) {
      throw new UnauthorizedException(
        "Invalid or expired password reset token",
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.passwordResetToken.updateMany({
        where: {
          id: reset.id,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) {
        throw new UnauthorizedException(
          "Invalid or expired password reset token",
        );
      }
      await transaction.adminUser.update({
        where: { id: reset.accountId },
        data: { passwordHash },
      });
      await transaction.passwordResetToken.updateMany({
        where: { accountId: reset.accountId, consumedAt: null },
        data: { consumedAt: now },
      });
      await transaction.adminRefreshToken.updateMany({
        where: { adminId: reset.accountId, revokedAt: null },
        data: { revokedAt: now },
      });
    });
    return { passwordUpdated: true };
  }

  async googleLogin(
    idToken: string,
    category: "CLIENT" | "SALES_REPRESENTATIVE" | "MASTER_ADMIN" | "OTHER",
  ): Promise<LoginResult> {
    if (category === "OTHER") {
      throw new ForbiddenException(
        "Guests do not need an account to view the public website.",
      );
    }
    if (!this.googleClientId) {
      throw new ServiceUnavailableException("Google sign-in is not configured");
    }

    let payload: TokenPayload | undefined;
    try {
      const ticket = await new OAuth2Client(this.googleClientId).verifyIdToken({
        idToken,
        audience: this.googleClientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException("Invalid Google sign-in token");
    }

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new UnauthorizedException(
        "Google account must have a verified email",
      );
    }

    let account = await this.prisma.adminUser.findFirst({
      where: {
        oauthIdentities: {
          some: {
            provider: OAuthProvider.GOOGLE,
            providerAccountId: payload.sub,
          },
        },
      },
    });

    if (account) {
      this.assertLoginCategory(account.role, category);
      if (!account.isActive) {
        throw new UnauthorizedException("This account is inactive.");
      }
    } else {
      const email = this.normalizeEmail(payload.email);
      const existingAccount = await this.prisma.adminUser.findUnique({
        where: { email },
      });
      if (existingAccount) {
        if (!existingAccount.isActive) {
          throw new UnauthorizedException("This account is inactive.");
        }
        this.assertLoginCategory(existingAccount.role, category);
        try {
          await this.prisma.oAuthIdentity.create({
            data: {
              accountId: existingAccount.id,
              provider: OAuthProvider.GOOGLE,
              providerAccountId: payload.sub,
              providerEmail: email,
            },
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            throw new ConflictException(
              "This Google account is already linked to another account.",
            );
          }
          throw error;
        }
        account = await this.prisma.adminUser.update({
          where: { id: existingAccount.id },
          data: {
            emailVerifiedAt: existingAccount.emailVerifiedAt ?? new Date(),
          },
        });
      } else {
        if (category !== "CLIENT") {
          throw new UnauthorizedException(
            "This account must be created by the Super Admin before sign-in.",
          );
        }

        try {
          account = await this.prisma.adminUser.create({
            data: {
              name: payload.name?.trim().slice(0, 120) || email,
              email,
              role: Role.USER,
              isActive: true,
              emailVerifiedAt: new Date(),
              oauthIdentities: {
                create: {
                  provider: OAuthProvider.GOOGLE,
                  providerAccountId: payload.sub,
                  providerEmail: email,
                },
              },
              clientAccessRequest: { create: {} },
            },
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            throw new ConflictException(
              "This Google account is already registered. Please sign in again.",
            );
          }
          throw error;
        }
      }
    }

    this.assertLoginCategory(account.role, category);
    if (!account.emailVerifiedAt) {
      account = await this.prisma.adminUser.update({
        where: { id: account.id },
        data: { emailVerifiedAt: new Date() },
      });
    }
    await this.assertAccountAccess(account.id, account.role);
    await this.prisma.adminUser.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    });
    return this.login(this.toAdminAuth(account));
  }

  async listClientAccessRequests() {
    return this.prisma.clientAccessRequest.findMany({
      where: { account: { role: Role.USER } },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        account: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerifiedAt: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { requestedAt: "desc" },
    });
  }

  async decideClientAccessRequest(
    requestId: string,
    reviewerId: string,
    decision: "APPROVE" | "REJECT",
    rejectionReason?: string,
  ) {
    const request = await this.prisma.clientAccessRequest.findUnique({
      where: { id: requestId },
      include: {
        account: {
          select: { emailVerifiedAt: true, isActive: true, role: true },
        },
      },
    });
    if (!request || request.status !== ClientAccessStatus.PENDING) {
      throw new NotFoundException("Pending client access request not found");
    }
    if (!request.account.isActive || request.account.role !== Role.USER) {
      throw new NotFoundException("Pending client access request not found");
    }
    if (decision === "APPROVE" && !request.account.emailVerifiedAt) {
      throw new BadRequestException(
        "Verify the applicant's email before approving access.",
      );
    }

    const result = await this.prisma.clientAccessRequest.updateMany({
      where: { id: requestId, status: ClientAccessStatus.PENDING },
      data: {
        status:
          decision === "APPROVE"
            ? ClientAccessStatus.APPROVED
            : ClientAccessStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedById: reviewerId,
        rejectionReason:
          decision === "REJECT" ? rejectionReason?.trim() || null : null,
      },
    });
    if (result.count !== 1) {
      throw new ConflictException(
        "This access request has already been reviewed",
      );
    }

    return { reviewed: true as const };
  }

  async deactivateClient(id: string): Promise<{ isActive: false }> {
    const request = await this.prisma.clientAccessRequest.findFirst({
      where: {
        accountId: id,
        status: ClientAccessStatus.APPROVED,
        account: { role: Role.USER, isActive: true },
      },
      select: { accountId: true },
    });
    if (!request) {
      throw new NotFoundException("Approved active client not found");
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.adminUser.update({
        where: { id },
        data: { isActive: false },
      }),
      this.prisma.adminRefreshToken.updateMany({
        where: { adminId: id, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    return { isActive: false };
  }

  async restoreClient(id: string): Promise<{ isActive: true }> {
    const result = await this.prisma.adminUser.updateMany({
      where: {
        id,
        role: Role.USER,
        isActive: false,
        clientAccessRequest: { is: { status: ClientAccessStatus.APPROVED } },
      },
      data: { isActive: true },
    });
    if (result.count !== 1) {
      throw new NotFoundException("Revoked approved client not found");
    }
    return { isActive: true };
  }

  async listRepresentatives() {
    return this.prisma.adminUser.findMany({
      where: { role: Role.SALES_REPRESENTATIVE },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async restoreRepresentative(id: string): Promise<{ isActive: true }> {
    const result = await this.prisma.adminUser.updateMany({
      where: { id, role: Role.SALES_REPRESENTATIVE },
      data: { isActive: true },
    });
    if (result.count !== 1) {
      throw new NotFoundException("Sales representative not found");
    }
    return { isActive: true };
  }

  async createRepresentative(dto: CreateRepresentativeDto) {
    this.assertPasswordLength(dto.password);
    if (!dto.name.trim()) {
      throw new BadRequestException("Name is required");
    }

    try {
      const representative = await this.prisma.adminUser.create({
        data: {
          name: dto.name.trim(),
          email: this.normalizeEmail(dto.email),
          passwordHash: await bcrypt.hash(dto.password, 12),
          role: Role.SALES_REPRESENTATIVE,
          isActive: true,
          emailVerifiedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });
      return representative;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("An account already uses this email");
      }
      throw error;
    }
  }

  async deactivateRepresentative(id: string): Promise<{ deleted: true }> {
    const representative = await this.prisma.adminUser.findFirst({
      where: { id, role: Role.SALES_REPRESENTATIVE },
      select: { id: true },
    });
    if (!representative) {
      throw new NotFoundException("Sales representative not found");
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.adminUser.update({
        where: { id },
        data: { isActive: false },
      }),
      this.prisma.adminRefreshToken.updateMany({
        where: { adminId: id, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    return { deleted: true };
  }

  async validateAdmin(
    email: string,
    password: string,
    ip?: string,
    category?: "CLIENT" | "SALES_REPRESENTATIVE" | "MASTER_ADMIN",
  ): Promise<AdminAuth> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!admin) {
      this.logFailedAttempt(email, ip);
      throw new UnauthorizedException("Invalid credentials");
    }

    const validPassword =
      admin.passwordHash !== null &&
      (await bcrypt.compare(password, admin.passwordHash));
    if (
      !validPassword ||
      !admin.isActive ||
      !admin.emailVerifiedAt ||
      !this.isSupportedLoginRole(admin.role)
    ) {
      this.logFailedAttempt(email, ip);
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!category) {
      throw new UnauthorizedException("Select the account type to sign in.");
    }
    this.assertLoginCategory(admin.role, category);
    await this.assertAccountAccess(admin.id, admin.role);

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    return this.toAdminAuth(admin);
  }

  async login(admin: AdminAuth): Promise<LoginResult> {
    await this.assertAccountAccess(admin.id, admin.role);
    const refreshToken = this.generateRefreshToken();
    const session = await this.prisma.adminRefreshToken.create({
      data: {
        adminId: admin.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + ms(this.refreshExpiresIn)),
      },
      select: { id: true },
    });
    return this.buildLoginResult(admin, refreshToken, session.id);
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
      await this.revokeAllForAdmin(
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
    if (
      !admin.isActive ||
      !admin.emailVerifiedAt ||
      !this.isSupportedLoginRole(admin.role)
    ) {
      await this.prisma.adminRefreshToken.update({
        where: { id: record.id },
        data: { revokedAt: now },
      });
      throw new UnauthorizedException("Admin account is inactive");
    }
    try {
      await this.assertAccountAccess(admin.id, admin.role);
    } catch (error) {
      await this.prisma.adminRefreshToken.update({
        where: { id: record.id },
        data: { revokedAt: now },
      });
      throw error;
    }

    const rotated = this.generateRefreshToken();
    const rotatedSessionId = await this.prisma.$transaction(
      async (transaction) => {
        const claimed = await transaction.adminRefreshToken.updateMany({
          where: {
            id: record.id,
            revokedAt: null,
            expiresAt: { gt: now },
          },
          data: { revokedAt: now },
        });
        if (claimed.count !== 1) return null;

        const rotatedRecord = await transaction.adminRefreshToken.create({
          data: {
            adminId: admin.id,
            tokenHash: this.hashToken(rotated),
            expiresAt: new Date(Date.now() + ms(this.refreshExpiresIn)),
          },
          select: { id: true },
        });
        await transaction.adminRefreshToken.update({
          where: { id: record.id },
          data: { replacedById: rotatedRecord.id },
        });
        return rotatedRecord.id;
      },
    );
    if (!rotatedSessionId) {
      await this.revokeAllForAdmin(
        record.adminId,
        `concurrent refresh token reuse ${record.id}`,
      );
      throw new UnauthorizedException("Invalid refresh token");
    }

    return this.buildLoginResult(
      this.toAdminAuth(admin),
      rotated,
      rotatedSessionId,
    );
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
    if (!admin || !admin.isActive || !admin.emailVerifiedAt) {
      throw new UnauthorizedException("Admin not found or inactive");
    }
    await this.assertAccountAccess(admin.id, admin.role);
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
    sessionId: string,
  ): LoginResult {
    const payload: JwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      sid: sessionId,
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

  private async sendVerificationCode(
    accountId: string,
    email: string,
    purpose: AuthCodePurpose,
  ): Promise<{ sent: boolean; retryAfterSeconds: number }> {
    const now = new Date();
    const latest = await this.prisma.authVerificationCode.findFirst({
      where: {
        accountId,
        purpose,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });
    if (
      latest &&
      now.getTime() - latest.createdAt.getTime() < CODE_RESEND_INTERVAL_MS
    ) {
      const elapsedMs = now.getTime() - latest.createdAt.getTime();
      return {
        sent: false,
        retryAfterSeconds: Math.ceil(
          (CODE_RESEND_INTERVAL_MS - elapsedMs) / 1000,
        ),
      };
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const challengeId = await this.prisma.$transaction(async (transaction) => {
      await transaction.authVerificationCode.updateMany({
        where: { accountId, purpose, consumedAt: null },
        data: { consumedAt: now },
      });
      const challenge = await transaction.authVerificationCode.create({
        data: {
          accountId,
          purpose,
          codeHash: this.hashCode(accountId, purpose, code),
          expiresAt: new Date(now.getTime() + CODE_TTL_MS),
          maxAttempts: CODE_MAX_ATTEMPTS,
        },
      });
      return challenge.id;
    });

    const sent = await this.mailService.sendAuthVerificationCode(
      email,
      code,
      purpose,
    );
    if (!sent) {
      await this.prisma.authVerificationCode.deleteMany({
        where: { id: challengeId, consumedAt: null },
      });
      this.logger.error(
        `Could not send ${purpose} verification email to account ${accountId}`,
      );
      throw new ServiceUnavailableException(
        "Verification email could not be sent. Please try again later.",
      );
    }

    await this.prisma.authVerificationCode.updateMany({
      where: { id: challengeId, consumedAt: null },
      data: { expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    });
    return {
      sent: true,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil(
          (CODE_RESEND_INTERVAL_MS - (Date.now() - now.getTime())) / 1000,
        ),
      ),
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private assertPasswordLength(password: string): void {
    if (Buffer.byteLength(password, "utf8") > 72) {
      throw new BadRequestException("Password must not exceed 72 UTF-8 bytes");
    }
  }

  private hashCode(
    accountId: string,
    purpose: AuthCodePurpose,
    code: string,
  ): string {
    return createHmac("sha256", this.authCodeSecret)
      .update(`${accountId}:${purpose}:${code}`)
      .digest("hex");
  }

  private constantTimeEqual(actual: string, expected: string): boolean {
    if (!/^[a-f0-9]{64}$/i.test(actual) || !/^[a-f0-9]{64}$/i.test(expected)) {
      return false;
    }
    return timingSafeEqual(
      Buffer.from(actual, "hex"),
      Buffer.from(expected, "hex"),
    );
  }

  private toAdminAuth(account: {
    id: string;
    name: string;
    email: string;
    role: AdminAuth["role"];
  }): AdminAuth {
    return {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
    };
  }

  private isSupportedLoginRole(role: Role): boolean {
    return (
      role === Role.USER ||
      role === Role.SUPER_ADMIN ||
      role === Role.SALES_REPRESENTATIVE
    );
  }

  private assertLoginCategory(
    role: Role,
    category: "CLIENT" | "SALES_REPRESENTATIVE" | "MASTER_ADMIN",
  ): void {
    const expectedCategory =
      role === Role.USER
        ? "CLIENT"
        : role === Role.SALES_REPRESENTATIVE
          ? "SALES_REPRESENTATIVE"
          : role === Role.SUPER_ADMIN
            ? "MASTER_ADMIN"
            : null;
    if (category !== expectedCategory) {
      throw new ForbiddenException(
        "This account does not match the selected login type.",
      );
    }
  }

  private async assertAccountAccess(
    accountId: string,
    role: Role,
  ): Promise<void> {
    if (role !== Role.USER) return;
    const request = await this.prisma.clientAccessRequest.findUnique({
      where: { accountId },
      select: { status: true },
    });
    if (request?.status === ClientAccessStatus.PENDING) {
      throw new ForbiddenException(
        "Your access request is pending Super Admin approval.",
      );
    }
    if (request?.status === ClientAccessStatus.REJECTED) {
      throw new ForbiddenException(
        "Your access request was not approved. Contact the Super Admin for assistance.",
      );
    }
    if (request?.status !== ClientAccessStatus.APPROVED) {
      throw new ForbiddenException(
        "This account has no approved client access request.",
      );
    }
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
