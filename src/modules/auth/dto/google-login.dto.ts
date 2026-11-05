import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

export class GoogleLoginDto {
  @ApiProperty({ description: "Google ID token obtained by the browser" })
  @IsString()
  @MinLength(20)
  @MaxLength(8192)
  idToken!: string;

  @ApiProperty({
    enum: ["CLIENT", "SALES_REPRESENTATIVE", "MASTER_ADMIN", "OTHER"],
  })
  @IsIn(["CLIENT", "SALES_REPRESENTATIVE", "MASTER_ADMIN", "OTHER"])
  category!: "CLIENT" | "SALES_REPRESENTATIVE" | "MASTER_ADMIN" | "OTHER";
}
