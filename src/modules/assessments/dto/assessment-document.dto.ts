import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { ASSESSMENT_QUESTION_TYPES } from "../assessments.constants";

/**
 * The editor's content object stored in the JSONB `document` column. Identity
 * and lifecycle (slug/title/status) live in their own columns, so the document
 * carries only resultText, settings and sections. Shape mirrors the frontend
 * AdminAssessmentDocument content.
 */
export class AssessmentQuestionDto {
  @ApiProperty({ example: "sales-alignment-section-1-question-1" })
  @IsString()
  @MaxLength(160)
  id!: string;

  @ApiProperty({ example: "I can clearly name my top three strengths." })
  @IsString()
  @MaxLength(2000)
  prompt!: string;

  @ApiProperty({ enum: [...ASSESSMENT_QUESTION_TYPES], example: "scale" })
  @IsIn(ASSESSMENT_QUESTION_TYPES)
  type!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  required!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  helperText?: string;

  @ApiPropertyOptional({ example: "Strongly disagree" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  lowLabel?: string;

  @ApiPropertyOptional({ example: "Strongly agree" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  highLabel?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  options?: string[];
}

export class AssessmentSectionDto {
  @ApiProperty({ example: "sales-alignment-section-1" })
  @IsString()
  @MaxLength(160)
  id!: string;

  @ApiProperty({ example: "Self-awareness" })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;

  @ApiProperty({ type: [AssessmentQuestionDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AssessmentQuestionDto)
  questions!: AssessmentQuestionDto[];
}

export class AssessmentSettingsDto {
  @ApiProperty({ example: "" })
  @IsString()
  @MaxLength(5000)
  introduction!: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  allowRetake!: boolean;
}

export class AssessmentDocumentDto {
  @ApiProperty({ example: "" })
  @IsString()
  @MaxLength(5000)
  resultText!: string;

  @ApiProperty({ type: AssessmentSettingsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => AssessmentSettingsDto)
  settings!: AssessmentSettingsDto;

  @ApiProperty({ type: [AssessmentSectionDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AssessmentSectionDto)
  sections!: AssessmentSectionDto[];
}
