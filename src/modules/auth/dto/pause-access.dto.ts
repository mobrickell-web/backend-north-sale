import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class PauseAccessDto {
  @ApiProperty({
    description: "Required comment explaining why access is paused",
    minLength: 1,
    maxLength: 2000,
    example: "Invoice overdue — pause until payment clears.",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reason!: string;
}
