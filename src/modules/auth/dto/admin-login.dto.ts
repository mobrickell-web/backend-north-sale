import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsIn, IsString, MinLength } from "class-validator";

export class AdminLoginDto {
  @ApiProperty({ example: "admin@northpointsales.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "change-me-to-a-strong-password", minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({
    enum: ["CLIENT", "SALES_REPRESENTATIVE", "MASTER_ADMIN"],
  })
  @IsIn(["CLIENT", "SALES_REPRESENTATIVE", "MASTER_ADMIN"])
  category!: "CLIENT" | "SALES_REPRESENTATIVE" | "MASTER_ADMIN";
}
