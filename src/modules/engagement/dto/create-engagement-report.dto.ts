import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { ReportType } from "../../../generated/prisma/enums";

/** Metadata-only update shape. New reports must use the multipart upload endpoint. */
export class CreateEngagementReportDto {
  @IsString()
  @MaxLength(150)
  title!: string;

  @IsEnum(ReportType)
  type!: ReportType;

  @IsString()
  @MaxLength(100)
  period!: string;

  @IsOptional()
  @IsString()
  summary?: string;
}
