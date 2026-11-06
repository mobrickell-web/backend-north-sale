import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, MaxLength, MinLength } from "class-validator";
import {
  GOOGLE_LOGIN_CATEGORIES,
  type GoogleLoginCategory,
} from "../auth.constants";

export class GoogleLoginDto {
  @ApiProperty({ description: "Google ID token obtained by the browser" })
  @IsString()
  @MinLength(20)
  @MaxLength(8192)
  idToken!: string;

  @ApiProperty({ enum: GOOGLE_LOGIN_CATEGORIES })
  @IsIn(GOOGLE_LOGIN_CATEGORIES)
  category!: GoogleLoginCategory;
}
