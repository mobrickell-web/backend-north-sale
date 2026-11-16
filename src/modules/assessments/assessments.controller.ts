import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AssessmentsService } from "./assessments.service";

@ApiTags("Public Assessments")
@Controller("assessments")
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get("client-primary")
  @ApiOperation({
    summary:
      "Get the client-facing primary published assessment (same as clients see)",
  })
  @ApiOkResponse({
    description: "Client-facing published assessment with client-safe document",
  })
  @ApiNotFoundResponse({
    description: "No published client-facing assessment is assigned",
  })
  findClientPrimary() {
    return this.assessmentsService.findClientFacingPublished();
  }

  @Get(":slug")
  @ApiOperation({
    summary:
      "Get a published assessment by slug (client-edition document only)",
  })
  @ApiOkResponse({
    description: "Published assessment with client-safe document",
  })
  @ApiNotFoundResponse({
    description: "Unknown slug, or the assessment is not published",
  })
  findBySlug(@Param("slug") slug: string) {
    return this.assessmentsService.findPublishedBySlug(slug);
  }
}
