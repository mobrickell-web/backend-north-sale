import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import {
  JwtAuthGuard,
  SuperAdminGuard,
} from "../../../common/guards/jwt-auth.guard";
import type { AdminAuth } from "../../../common/interfaces/admin-auth.interface";
import { AdminAssessmentsService } from "./admin-assessments.service";
import {
  AdminAssessmentQueryDto,
  AssessmentClientPrimaryDto,
  AssessmentStatusUpdateDto,
  CreateAssessmentDto,
  UpdateAssessmentDto,
} from "./dto/admin-assessment.dto";

@ApiTags("Admin Assessments")
@ApiSecurity("access-cookie")
@ApiUnauthorizedResponse({ description: "Missing or invalid auth cookie" })
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller("admin/assessments")
export class AdminAssessmentsController {
  constructor(
    private readonly adminAssessmentsService: AdminAssessmentsService,
  ) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Create an assessment (defaults to DRAFT)" })
  @ApiCreatedResponse({ description: "Assessment created" })
  create(@Body() dto: CreateAssessmentDto) {
    return this.adminAssessmentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List assessments (filter by status / search)" })
  @ApiOkResponse({ description: "Paginated list of assessments" })
  list(@Query() query: AdminAssessmentQueryDto) {
    return this.adminAssessmentsService.list(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one assessment with its full document" })
  @ApiOkResponse({ description: "Assessment detail" })
  detail(@Param("id", ParseUUIDPipe) id: string) {
    return this.adminAssessmentsService.detail(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Edit an assessment's slug, title or document" })
  @ApiOkResponse({ description: "Assessment updated" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssessmentDto,
  ) {
    return this.adminAssessmentsService.update(id, dto);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Publish, draft or archive an assessment" })
  @ApiOkResponse({ description: "Assessment status updated" })
  changeStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssessmentStatusUpdateDto,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.adminAssessmentsService.changeStatus(id, dto, admin.id);
  }

  @Post(":id/client-primary")
  @HttpCode(200)
  @ApiOperation({
    summary:
      "Toggle client-facing primary (at most one ON; OFF clears all for clients)",
  })
  @ApiOkResponse({ description: "Client-facing primary assessment updated" })
  setClientPrimary(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssessmentClientPrimaryDto,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.adminAssessmentsService.setClientPrimary(
      id,
      admin.id,
      dto.enabled ?? true,
    );
  }

  @Delete(":id")
  @HttpCode(200)
  @ApiOperation({ summary: "Delete an assessment" })
  @ApiOkResponse({ description: "Assessment deleted" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.adminAssessmentsService.remove(id);
  }
}
