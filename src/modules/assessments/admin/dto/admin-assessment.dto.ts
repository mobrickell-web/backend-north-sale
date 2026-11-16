import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { ASSESSMENT_STATUSES, SLUG_PATTERN } from "../../assessments.constants";
import { AssessmentDocumentDto } from "../../dto/assessment-document.dto";

export class CreateAssessmentDto {
  @ApiProperty({ example: "sales-alignment" })
  @IsString()
  @MaxLength(120)
  @Matches(SLUG_PATTERN, {
    message: "slug must be lowercase kebab-case (a-z, 0-9, hyphens)",
  })
  slug!: string;

  @ApiProperty({ example: "Sales Alignment Assessment" })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    enum: [...ASSESSMENT_STATUSES],
    default: "DRAFT",
  })
  @IsOptional()
  @IsIn(ASSESSMENT_STATUSES)
  status?: string;

  @ApiProperty({ type: AssessmentDocumentDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => AssessmentDocumentDto)
  document!: AssessmentDocumentDto;
}

export class UpdateAssessmentDto {
  @ApiPropertyOptional({ example: "sales-alignment" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(SLUG_PATTERN, {
    message: "slug must be lowercase kebab-case (a-z, 0-9, hyphens)",
  })
  slug?: string;

  @ApiPropertyOptional({ example: "Sales Alignment Assessment" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ type: AssessmentDocumentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssessmentDocumentDto)
  document?: AssessmentDocumentDto;
}

export class AssessmentStatusUpdateDto {
  @ApiProperty({ enum: [...ASSESSMENT_STATUSES], example: "PUBLISHED" })
  @IsIn(ASSESSMENT_STATUSES)
  status!: string;
}

export class AssessmentClientPrimaryDto {
  @ApiPropertyOptional({
    description:
      "true = set as the only client-facing assessment; false = clear (none shown)",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;
}

export class AdminAssessmentQueryDto {
  @ApiPropertyOptional({ enum: [...ASSESSMENT_STATUSES], example: "PUBLISHED" })
  @IsOptional()
  @IsIn(ASSESSMENT_STATUSES)
  status?: string;

  @ApiPropertyOptional({ example: "Sales" })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  take?: number = 100;
}
