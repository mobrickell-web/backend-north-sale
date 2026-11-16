import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { ReportType } from "../../../generated/prisma/enums";

export class UploadEngagementReportDto {
  @ApiProperty({ example: "Q1 progress" })
  @IsString()
  @MaxLength(150)
  title!: string;

  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  type!: ReportType;

  @ApiProperty({ example: "2026-Q1" })
  @IsString()
  @MaxLength(100)
  period!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;
}
