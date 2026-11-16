import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import {
  JwtAuthGuard,
  RepOrAdminGuard,
} from "../../../common/guards/jwt-auth.guard";
import type { AdminAuth } from "../../../common/interfaces/admin-auth.interface";
import { AssessmentInstancesService } from "../assessment-instances.service";
import { SubmitAssessmentAnswersDto } from "../dto/submit-assessment-answers.dto";

@ApiTags("On-behalf Assessment")
@ApiSecurity("access-cookie")
@ApiUnauthorizedResponse({ description: "Missing or invalid auth session" })
@UseGuards(JwtAuthGuard, RepOrAdminGuard)
@Controller("on-behalf")
export class OnBehalfAssessmentController {
  constructor(private readonly instances: AssessmentInstancesService) {}

  @Get(":token")
  @ApiOperation({
    summary: "Load assessment for one-time Zoom on-behalf completion",
  })
  @ApiOkResponse({ description: "Client-edition assessment payload" })
  get(@Param("token") token: string, @CurrentUser() user: AdminAuth) {
    return this.instances.getOnBehalfView(token, user.id);
  }

  @Post(":token/submit")
  @HttpCode(200)
  @ApiOperation({
    summary: "Submit on-behalf answers; consumes the one-time token",
  })
  @ApiOkResponse({ description: "Completed assessment with result" })
  submit(
    @Param("token") token: string,
    @Body() dto: SubmitAssessmentAnswersDto,
    @CurrentUser() user: AdminAuth,
  ) {
    return this.instances.submitOnBehalf(token, user.id, dto.answers);
  }
}
