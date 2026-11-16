import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
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
import { AssessmentInstancesService } from "../assessment-instances.service";
import { CreateAssessmentInstanceDto } from "../dto/create-assessment-instance.dto";

@ApiTags("Admin Assessment Instances")
@ApiSecurity("access-cookie")
@ApiUnauthorizedResponse({ description: "Missing or invalid admin auth" })
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller()
export class AdminAssessmentInstancesController {
  constructor(private readonly instances: AssessmentInstancesService) {}

  @Get("admin/clients/:clientId/instances")
  @ApiOperation({
    summary: "List assessment instances for a client (incl. results status)",
  })
  @ApiOkResponse({ description: "Client assessment instances" })
  listForClient(@Param("clientId", ParseUUIDPipe) clientId: string) {
    return this.instances.listForClient(clientId);
  }

  @Get("admin/instances/:id")
  @ApiOperation({
    summary:
      "Get one assessment instance with client-safe result when completed",
  })
  @ApiOkResponse({ description: "Assessment instance detail" })
  getInstance(@Param("id", ParseUUIDPipe) id: string) {
    return this.instances.getAdminInstanceDetail(id);
  }

  @Post("admin/clients/:clientId/instances")
  @HttpCode(201)
  @ApiOperation({
    summary: "Create a client assessment instance (e.g. for a Zoom meeting)",
  })
  @ApiCreatedResponse({ description: "Instance created" })
  createInstance(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Body() dto: CreateAssessmentInstanceDto,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.instances.createForClient(clientId, admin.id, {
      assessmentId: dto.assessmentId,
      slug: dto.slug,
    });
  }

  @Post("admin/instances/:id/on-behalf")
  @HttpCode(200)
  @ApiOperation({
    summary: "Issue a one-time Zoom on-behalf completion token",
  })
  @ApiOkResponse({ description: "One-time token issued" })
  issueOnBehalf(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.instances.issueOnBehalfToken(id, admin.id);
  }
}
