import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class UpdatePasswordDto {
  @ApiProperty({
    description: "One-time reset token returned after code verification",
  })
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  resetToken!: string;

  @ApiProperty({ minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
