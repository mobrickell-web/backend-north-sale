import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsIn, IsString, MaxLength, MinLength } from "class-validator";
import type { StaffPosition } from "../../../generated/prisma/enums";
import { STAFF_POSITIONS } from "../auth.constants";

export class CreateRepresentativeDto {
  @ApiProperty({ example: "Jordan Lee", maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: "jordan@example.com" })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    description: "Initial password supplied by the Super Admin",
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({
    enum: STAFF_POSITIONS,
    description: "Staff position assigned by the Master Admin",
  })
  @IsIn(STAFF_POSITIONS)
  position!: StaffPosition;
}
