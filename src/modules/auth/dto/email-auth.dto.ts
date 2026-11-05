import { ApiProperty } from "@nestjs/swagger";
import { AuthCodePurpose } from "../../../generated/prisma/enums";
import { IsEmail, IsEnum, IsString, Matches, MaxLength } from "class-validator";

export class EmailAuthDto {
  @ApiProperty({ example: "alex@example.com" })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}

export class VerifyCodeDto extends EmailAuthDto {
  @ApiProperty({ enum: AuthCodePurpose, example: AuthCodePurpose.SIGNUP })
  @IsEnum(AuthCodePurpose)
  purpose!: AuthCodePurpose;

  @ApiProperty({ example: "042816", pattern: "^\\d{6}$" })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class ResendCodeDto extends EmailAuthDto {
  @ApiProperty({ enum: AuthCodePurpose, example: AuthCodePurpose.SIGNUP })
  @IsEnum(AuthCodePurpose)
  purpose!: AuthCodePurpose;
}
