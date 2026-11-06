import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpStatus,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  JwtAuthGuard,
  SuperAdminGuard,
} from "../../common/guards/jwt-auth.guard";
import type { AdminAuth } from "../../common/interfaces/admin-auth.interface";
import { AuthService, LoginResult } from "./auth.service";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { ClientAccessDecisionDto } from "./dto/client-access-decision.dto";
import { ResendCodeDto, VerifyCodeDto } from "./dto/email-auth.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { SignupDto } from "./dto/signup.dto";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { CreateRepresentativeDto } from "./dto/create-representative.dto";
import { CreateClientDto } from "./dto/create-client.dto";
import { LocalAuthGuard } from "./guards/local-auth.guard";

const REFRESH_COOKIE_NAME = "north_admin_refresh_token";
const REFRESH_COOKIE_PATH = "/api/v1/auth";
const ACCESS_COOKIE_NAME = "north_admin_access_token";
const ACCESS_COOKIE_PATH = "/";
const LEGACY_ACCESS_COOKIE_PATH = "/api/v1";

type AuthSessionResponse = Omit<LoginResult, "accessToken" | "refreshToken">;

function getRefreshToken(request: Request): string | null {
  const prefix = `${REFRESH_COOKIE_NAME}=`;
  const cookie = request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return cookie?.slice(prefix.length) || null;
}

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshCookie(response: Response, session: LoginResult): void {
    response.cookie(REFRESH_COOKIE_NAME, session.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: REFRESH_COOKIE_PATH,
      maxAge: session.refreshExpiresIn * 1000,
    });
  }

  private setAccessCookie(response: Response, session: LoginResult): void {
    response.clearCookie(ACCESS_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: LEGACY_ACCESS_COOKIE_PATH,
    });
    response.cookie(ACCESS_COOKIE_NAME, session.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: ACCESS_COOKIE_PATH,
      maxAge: session.expiresIn * 1000,
    });
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: REFRESH_COOKIE_PATH,
    });
  }

  private clearAccessCookie(response: Response): void {
    response.clearCookie(ACCESS_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: ACCESS_COOKIE_PATH,
    });
    response.clearCookie(ACCESS_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: LEGACY_ACCESS_COOKIE_PATH,
    });
  }

  private sessionResponse(
    session: LoginResult,
    response: Response,
  ): AuthSessionResponse {
    this.setRefreshCookie(response, session);
    this.setAccessCookie(response, session);
    return {
      tokenType: session.tokenType,
      expiresIn: session.expiresIn,
      refreshExpiresIn: session.refreshExpiresIn,
      admin: session.admin,
    };
  }

  /**
   * Self-signup is disabled: client accounts are created by the Master Admin.
   * The route is kept so older clients receive a clear message.
   */
  @Post("signup")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary: "Disabled — client accounts are created by the Master Admin",
  })
  @ApiBody({ type: SignupDto, required: false })
  @ApiForbiddenResponse({
    description: "Client accounts are created by the Master Admin.",
  })
  signup(): never {
    throw new ForbiddenException(
      "Client accounts are created by the Master Admin.",
    );
  }

  @Post("verify-code")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Verify signup or password-reset code" })
  verifyCode(@Body() dto: VerifyCodeDto): Promise<{
    verified: true;
    alreadyVerified?: true;
    resetToken?: string;
    message: string;
  }> {
    return this.authService.verifyCode(dto);
  }

  @Post("resend-code")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: "Resend a signup or password-reset code" })
  resendCode(
    @Body() dto: ResendCodeDto,
  ): Promise<{ message: string; retryAfterSeconds?: number }> {
    return this.authService.resendCode(dto);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: "Request a password-reset verification code" })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto.email);
  }

  @Post("update-password")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Set a new password using a reset token" })
  updatePassword(
    @Body() dto: UpdatePasswordDto,
  ): Promise<{ passwordUpdated: true }> {
    return this.authService.updatePassword(dto);
  }

  @Post("google")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: "Sign in with Google (pre-authorized accounts only)",
  })
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponse> {
    const session = await this.authService.googleLogin(
      dto.idToken,
      dto.category,
    );
    return this.sessionResponse(session, response);
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: "Account login — sets a refresh-token cookie" })
  @ApiUnauthorizedResponse({ description: "Invalid email or password" })
  async login(
    @Body() _dto: AdminLoginDto,
    @CurrentUser() admin: AdminAuth,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponse> {
    const session = await this.authService.login(admin);
    return this.sessionResponse(session, response);
  }

  @Post("refresh")
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: "Rotate the refresh-token cookie and issue a new access token",
  })
  @ApiUnauthorizedResponse({
    description: "Invalid, revoked or expired refresh token",
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponse> {
    const refreshToken = getRefreshToken(req);
    if (!refreshToken) {
      this.clearRefreshCookie(response);
      this.clearAccessCookie(response);
      throw new UnauthorizedException("Refresh token is missing");
    }

    try {
      const session = await this.authService.refresh(refreshToken, req.ip);
      return this.sessionResponse(session, response);
    } catch (error) {
      this.clearRefreshCookie(response);
      this.clearAccessCookie(response);
      throw error;
    }
  }

  @Post("logout")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiSecurity("access-cookie")
  @ApiOperation({ summary: "Revoke the current cookie-authenticated session" })
  async logout(
    @Req() req: Request,
    @CurrentUser() admin: AdminAuth,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ revoked: boolean }> {
    this.clearRefreshCookie(response);
    this.clearAccessCookie(response);
    const refreshToken = getRefreshToken(req);
    if (!refreshToken) return { revoked: false };
    return this.authService.logout(refreshToken, admin.id);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiSecurity("access-cookie")
  @ApiOperation({ summary: "Get current authenticated account profile" })
  me(@CurrentUser() admin: AdminAuth): Promise<AdminAuth> {
    return this.authService.getMe(admin.id);
  }

  @Get("admin/representatives")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiSecurity("access-cookie")
  @ApiOperation({ summary: "List sales representative accounts" })
  listRepresentatives() {
    return this.authService.listRepresentatives();
  }

  @Get("admin/client-access-requests")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiSecurity("access-cookie")
  @ApiOperation({
    summary: "List all client access requests and access states",
  })
  listClientAccessRequests() {
    return this.authService.listClientAccessRequests();
  }

  @Post("admin/client-access-requests/:id/decision")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiSecurity("access-cookie")
  @ApiOperation({
    summary: "Approve or reject a pending client access request",
  })
  decideClientAccessRequest(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ClientAccessDecisionDto,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.authService.decideClientAccessRequest(
      id,
      admin.id,
      dto.decision,
      dto.rejectionReason,
    );
  }

  @Post("admin/clients")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiSecurity("access-cookie")
  @ApiOperation({
    summary: "Create an approved client account (Master Admin only)",
  })
  @ApiConflictResponse({ description: "An account already uses this email" })
  createClient(@Body() dto: CreateClientDto, @CurrentUser() admin: AdminAuth) {
    return this.authService.createClient(dto, admin.id);
  }

  @Delete("admin/clients/:id/access")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiSecurity("access-cookie")
  @ApiOperation({
    summary: "Revoke approved client access and revoke all active sessions",
  })
  deactivateClient(@Param("id", ParseUUIDPipe) id: string) {
    return this.authService.deactivateClient(id);
  }

  @Post("admin/clients/:id/access/restore")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiSecurity("access-cookie")
  @ApiOperation({ summary: "Restore access for a revoked approved client" })
  restoreClient(@Param("id", ParseUUIDPipe) id: string) {
    return this.authService.restoreClient(id);
  }

  @Post("admin/representatives")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiSecurity("access-cookie")
  @ApiOperation({ summary: "Create a sales representative account" })
  createRepresentative(@Body() dto: CreateRepresentativeDto) {
    return this.authService.createRepresentative(dto);
  }

  @Delete("admin/representatives/:id")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiSecurity("access-cookie")
  @ApiOperation({
    summary: "Deactivate a representative and revoke their sessions",
  })
  deactivateRepresentative(@Param("id", ParseUUIDPipe) id: string) {
    return this.authService.deactivateRepresentative(id);
  }

  @Post("admin/representatives/:id/restore")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiSecurity("access-cookie")
  @ApiOperation({ summary: "Restore a deactivated representative's access" })
  restoreRepresentative(@Param("id", ParseUUIDPipe) id: string) {
    return this.authService.restoreRepresentative(id);
  }
}
