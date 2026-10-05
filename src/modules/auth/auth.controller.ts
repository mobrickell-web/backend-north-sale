import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { AdminAuth } from "../../common/interfaces/admin-auth.interface";
import { AuthService, LoginResult } from "./auth.service";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { LocalAuthGuard } from "./guards/local-auth.guard";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: "Super Admin login — returns access + refresh tokens",
  })
  @ApiUnauthorizedResponse({ description: "Invalid email or password" })
  login(
    @Body() _dto: AdminLoginDto,
    @CurrentUser() admin: AdminAuth,
  ): Promise<LoginResult> {
    return this.authService.login(admin);
  }

  @Post("refresh")
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: "Rotate refresh token — issues a new access + refresh pair",
  })
  @ApiUnauthorizedResponse({
    description: "Invalid, revoked or expired refresh token",
  })
  refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<LoginResult> {
    return this.authService.refresh(dto.refreshToken, req.ip);
  }

  @Post("logout")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Revoke the presented refresh token (requires access token)",
  })
  logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser() admin: AdminAuth,
  ): Promise<{ revoked: boolean }> {
    return this.authService.logout(dto.refreshToken, admin.id);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current Super Admin profile" })
  me(@CurrentUser() admin: AdminAuth): Promise<AdminAuth> {
    return this.authService.getMe(admin.id);
  }
}
