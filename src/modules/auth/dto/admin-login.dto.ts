import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsIn, IsString, MinLength } from "class-validator";
import { LOGIN_CATEGORIES, type LoginCategory } from "../auth.constants";

export class AdminLoginDto {
  @ApiProperty({ example: "admin@northpointsales.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "change-me-to-a-strong-password", minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: LOGIN_CATEGORIES })
  @IsIn(LOGIN_CATEGORIES)
  category!: LoginCategory;
}
