import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import {
  ClientUserGuard,
  JwtAuthGuard,
} from "../../../common/guards/jwt-auth.guard";
import type { AdminAuth } from "../../../common/interfaces/admin-auth.interface";
import { AssessmentInstancesService } from "../assessment-instances.service";
import { CreateAssessmentInstanceDto } from "../dto/create-assessment-instance.dto";
import { SubmitAssessmentAnswersDto } from "../dto/submit-assessment-answers.dto";

@ApiTags("Client Assessment")
@ApiSecurity("access-cookie")
@ApiUnauthorizedResponse({ description: "Missing or invalid auth session" })
@UseGuards(JwtAuthGuard, ClientUserGuard)
@Controller("client/assessment")
export class ClientAssessmentController {
  constructor(private readonly instances: AssessmentInstancesService) {}

  @Get()
  @ApiOperation({
    summary:
      "Get own assessment (by slug, else client-facing primary) + history of all instances",
  })
  @ApiQuery({
    name: "slug",
    required: false,
    description:
      "Published assessment slug to load (omit to use the client-facing primary)",
  })
  @ApiOkResponse({ description: "Client assessment payload with history" })
  getAssessment(@CurrentUser() user: AdminAuth, @Query("slug") slug?: string) {
    return this.instances.getClientAssessmentView(user.id, { slug });
  }

  @Post("start")
  @HttpCode(201)
  @ApiOperation({
    summary: "Self-start (or resume) the client assessment instance",
  })
  @ApiCreatedResponse({ description: "Instance started" })
  start(
    @CurrentUser() user: AdminAuth,
    @Body() dto: CreateAssessmentInstanceDto,
  ) {
    return this.instances.startForClient(user.id, {
      assessmentId: dto.assessmentId,
      slug: dto.slug,
    });
  }

  @Get("instances/:instanceId")
  @ApiOperation({
    summary: "Get one of the client's own assessment instances (results view)",
  })
  @ApiOkResponse({ description: "Client assessment instance payload" })
  getInstance(
    @CurrentUser() user: AdminAuth,
    @Param("instanceId", ParseUUIDPipe) instanceId: string,
  ) {
    return this.instances.getClientInstanceView(user.id, instanceId);
  }

  @Post(":instanceId/submit")
  @HttpCode(200)
  @ApiOperation({
    summary: "Submit answers; server scores and stores client-safe result",
  })
  @ApiOkResponse({ description: "Completed assessment with result" })
  submit(
    @CurrentUser() user: AdminAuth,
    @Param("instanceId", ParseUUIDPipe) instanceId: string,
    @Body() dto: SubmitAssessmentAnswersDto,
  ) {
    return this.instances.submitForClient(user.id, instanceId, dto.answers);
  }
}
