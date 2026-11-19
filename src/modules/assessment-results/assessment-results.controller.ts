import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { AdminAuth } from "../../common/interfaces/admin-auth.interface";
import type { LoginResult } from "../auth/auth.service";
import { AssessmentResultsService } from "./assessment-results.service";
import { ClaimAssessmentResultDto } from "./dto/claim-assessment-result.dto";
import { CreateAssessmentResultDto } from "./dto/create-assessment-result.dto";

const REFRESH_COOKIE_NAME = "north_admin_refresh_token";
const REFRESH_COOKIE_PATH = "/api/v1/auth";
const ACCESS_COOKIE_NAME = "north_admin_access_token";
const ACCESS_COOKIE_PATH = "/";
const LEGACY_ACCESS_COOKIE_PATH = "/api/v1";

@ApiTags("Assessment Results")
@Controller("assessment-results")
export class AssessmentResultsController {
  constructor(
    private readonly assessmentResultsService: AssessmentResultsService,
  ) {}

  private setSessionCookies(response: Response, session: LoginResult): void {
    response.cookie(REFRESH_COOKIE_NAME, session.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: REFRESH_COOKIE_PATH,
      maxAge: session.refreshExpiresIn * 1000,
    });
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

  @Post("claim")
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary:
      "Public free assessment claim — create/approve client, store results, sign in",
  })
  @ApiCreatedResponse({
    description: "{ id, tokenType, expiresIn, refreshExpiresIn, admin }",
  })
  async claim(
    @Body() dto: ClaimAssessmentResultDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { id, session } = await this.assessmentResultsService.claim(dto);
    this.setSessionCookies(response, session);
    return {
      id,
      tokenType: session.tokenType,
      expiresIn: session.expiresIn,
      refreshExpiresIn: session.refreshExpiresIn,
      admin: session.admin,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiSecurity("access-cookie")
  @ApiUnauthorizedResponse({ description: "Missing or invalid auth cookie" })
  @ApiOperation({ summary: "Store a frontend-scored assessment submission" })
  @ApiCreatedResponse({ description: "{ id }" })
  create(
    @CurrentUser() user: AdminAuth,
    @Body() dto: CreateAssessmentResultDto,
  ) {
    return this.assessmentResultsService.create(user, dto);
  }

  @Get("mine")
  @UseGuards(JwtAuthGuard)
  @ApiSecurity("access-cookie")
  @ApiUnauthorizedResponse({ description: "Missing or invalid auth cookie" })
  @ApiOperation({
    summary:
      "List results for the caller's email or submitted by the caller, newest first",
  })
  @ApiOkResponse({ description: "Assessment result summaries" })
  listMine(@CurrentUser() user: AdminAuth) {
    return this.assessmentResultsService.listMine(user);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiSecurity("access-cookie")
  @ApiUnauthorizedResponse({ description: "Missing or invalid auth cookie" })
  @ApiOperation({ summary: "Get one assessment result with answers" })
  @ApiOkResponse({ description: "Full assessment result" })
  @ApiNotFoundResponse({ description: "Assessment result not found" })
  findOne(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.assessmentResultsService.findOne(user, id);
  }
}
