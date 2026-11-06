import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { AdminAuth } from "../../common/interfaces/admin-auth.interface";
import { AssessmentResultsService } from "./assessment-results.service";
import { CreateAssessmentResultDto } from "./dto/create-assessment-result.dto";

@ApiTags("Assessment Results")
@ApiSecurity("access-cookie")
@ApiUnauthorizedResponse({ description: "Missing or invalid auth cookie" })
@UseGuards(JwtAuthGuard)
@Controller("assessment-results")
export class AssessmentResultsController {
  constructor(
    private readonly assessmentResultsService: AssessmentResultsService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Store a frontend-scored assessment submission" })
  @ApiCreatedResponse({ description: "{ id }" })
  create(
    @CurrentUser() user: AdminAuth,
    @Body() dto: CreateAssessmentResultDto,
  ) {
    return this.assessmentResultsService.create(user, dto);
  }

  @Get("mine")
  @ApiOperation({
    summary:
      "List results for the caller's email or submitted by the caller, newest first",
  })
  @ApiOkResponse({ description: "Assessment result summaries" })
  listMine(@CurrentUser() user: AdminAuth) {
    return this.assessmentResultsService.listMine(user);
  }

  @Get(":id")
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
