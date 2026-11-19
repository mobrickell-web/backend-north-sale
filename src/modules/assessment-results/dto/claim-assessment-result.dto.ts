import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";
import { CreateAssessmentResultDto } from "./create-assessment-result.dto";

/** Public free-assessment claim: create client access + store results. */
export class ClaimAssessmentResultDto extends CreateAssessmentResultDto {
  @ApiProperty({
    minLength: 8,
    maxLength: 72,
    description: "Temporary password for the new (or updated) client account",
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
