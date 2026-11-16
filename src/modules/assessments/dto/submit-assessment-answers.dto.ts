import { ApiProperty } from "@nestjs/swagger";
import { IsObject } from "class-validator";

export class SubmitAssessmentAnswersDto {
  @ApiProperty({
    description:
      "Map of questionId → raw UI answer (scale 1–10, five-point 1–5, yes-no boolean/string, mc option index, short-answer string)",
    example: { "sales-target-achievement": 7 },
  })
  @IsObject()
  answers!: Record<string, number | string | boolean>;
}
