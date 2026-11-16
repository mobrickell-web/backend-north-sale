import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateKpiMeasurementDto {
  @IsString()
  @MaxLength(50)
  metricKey!: string;

  @IsNumber()
  value!: number;

  @IsOptional()
  @IsNumber()
  target?: number;

  @IsDateString()
  measuredAt!: string;
}
