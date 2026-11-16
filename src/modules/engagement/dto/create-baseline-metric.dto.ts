import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateBaselineMetricDto {
  @IsString()
  @MaxLength(50)
  metricKey!: string;

  @IsString()
  @MaxLength(150)
  label!: string;

  @IsNumber()
  value!: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsDateString()
  measuredAt!: string;

  @IsOptional()
  @IsString()
  source?: string;
}
