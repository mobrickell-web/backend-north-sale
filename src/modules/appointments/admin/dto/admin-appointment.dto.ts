import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export const ADMIN_TABS = ["upcoming", "completed", "cancelled"] as const;

export class AdminAppointmentQueryDto {
  @ApiPropertyOptional({ enum: [...ADMIN_TABS], example: "upcoming" })
  @IsOptional()
  @IsIn(ADMIN_TABS)
  status?: string;

  @ApiPropertyOptional({ example: "Acme" })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({
    example: "2026-10-01",
    description: "Filter from (inclusive, UTC day)",
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "from must be in YYYY-MM-DD format",
  })
  from?: string;

  @ApiPropertyOptional({
    example: "2026-10-31",
    description: "Filter until (exclusive, UTC day)",
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "to must be in YYYY-MM-DD format",
  })
  to?: string;

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

export class AdminStatusUpdateDto {
  @ApiProperty({ enum: ["COMPLETED", "CANCELLED"], example: "COMPLETED" })
  @IsIn(["COMPLETED", "CANCELLED"])
  status!: string;

  @ApiPropertyOptional({ example: "Meeting done" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
