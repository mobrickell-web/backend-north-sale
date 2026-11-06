import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

/** Empty strings skip format checks so a PATCH can clear an optional field. */
const isNonEmpty = (_object: object, value: unknown): boolean => value !== "";

export class CreateLeadDto {
  @ApiProperty({ example: "Taylor Brooks", minLength: 1, maxLength: 150 })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: "taylor@example.com", maxLength: 255 })
  @IsOptional()
  @IsString()
  @ValidateIf(isNonEmpty)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: "+1 555 010 0199", maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 150 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    maxLength: 255,
    description: "Empty string clears the email",
  })
  @IsOptional()
  @IsString()
  @ValidateIf(isNonEmpty)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    maxLength: 50,
    description: "Empty string clears the phone",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    maxLength: 500,
    description: "Empty string clears the address",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({
    maxLength: 5000,
    description: "Empty string clears the notes",
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
