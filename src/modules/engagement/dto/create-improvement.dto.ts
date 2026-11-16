import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { ImprovementStatus } from "../../../generated/prisma/enums";

export class CreateImprovementDto {
  @IsString()
  @MaxLength(150)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ownerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  ownerSide?: string;

  @IsOptional()
  @IsEnum(ImprovementStatus)
  status?: ImprovementStatus;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsDateString()
  agreedAt?: string;
}
