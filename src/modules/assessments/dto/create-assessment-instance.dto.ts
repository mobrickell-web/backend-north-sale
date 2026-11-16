import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";
import { SLUG_PATTERN } from "../assessments.constants";

export class CreateAssessmentInstanceDto {
  @ApiPropertyOptional({
    description:
      "Assessment id. If omitted, uses slug or the client-facing primary assessment.",
  })
  @IsOptional()
  @IsUUID()
  assessmentId?: string;

  @ApiPropertyOptional({
    description:
      "Published assessment slug (omit to use the client-facing primary)",
    example: "sales-alignment",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(SLUG_PATTERN)
  slug?: string;
}
