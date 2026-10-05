import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class AdminLoginDto {
  @ApiProperty({ example: "admin@northpointsales.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "change-me-to-a-strong-password", minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
