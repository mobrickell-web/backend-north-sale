import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsIn,
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateBy,
  type ValidationOptions,
} from "class-validator";

export const ASSESSMENT_TYPES = ["sales-alignment"] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

const MAX_ANSWER_KEYS = 200;
const MAX_ANSWER_VALUE = 10;
const MAX_RESULT_JSON_LENGTH = 64_000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

/** Plain object of at most 200 keys whose values are integers 0..10. */
function IsAnswerMap(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: "isAnswerMap",
      validator: {
        validate: (value: unknown): boolean => {
          if (!isPlainObject(value)) return false;
          const entries = Object.entries(value);
          return (
            entries.length <= MAX_ANSWER_KEYS &&
            entries.every(
              ([, answer]) =>
                Number.isInteger(answer) &&
                (answer as number) >= 0 &&
                (answer as number) <= MAX_ANSWER_VALUE,
            )
          );
        },
        defaultMessage: () =>
          `answers must be an object with at most ${MAX_ANSWER_KEYS} keys whose values are integers from 0 to ${MAX_ANSWER_VALUE}`,
      },
    },
    options,
  );
}

/** Plain object whose JSON serialisation is at most 64,000 characters. */
function IsBoundedResult(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: "isBoundedResult",
      validator: {
        validate: (value: unknown): boolean => {
          if (!isPlainObject(value)) return false;
          try {
            return JSON.stringify(value).length <= MAX_RESULT_JSON_LENGTH;
          } catch {
            return false;
          }
        },
        defaultMessage: () =>
          `result must be an object no larger than ${MAX_RESULT_JSON_LENGTH} characters when serialised`,
      },
    },
    options,
  );
}

export class CreateAssessmentResultDto {
  @ApiProperty({ enum: ASSESSMENT_TYPES, example: "sales-alignment" })
  @IsIn(ASSESSMENT_TYPES)
  assessment!: AssessmentType;

  @ApiProperty({ example: "Alex", minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  firstName!: string;

  @ApiProperty({ example: "alex@example.com", maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 42, minimum: 0 })
  @IsInt()
  @Min(0)
  overallScore!: number;

  @ApiProperty({
    example: 50,
    minimum: 1,
    description: "Must be greater than or equal to overallScore",
  })
  @IsInt()
  @Min(1)
  maxScore!: number;

  @ApiProperty({
    type: "object",
    additionalProperties: { type: "integer", minimum: 0, maximum: 10 },
    description: "Question id → answer (integer 0..10), at most 200 keys",
    example: { q1: 7, q2: 9 },
  })
  @IsAnswerMap()
  answers!: Record<string, number>;

  @ApiProperty({
    type: "object",
    additionalProperties: true,
    description:
      "Frontend-computed result payload (≤ 64,000 characters as JSON)",
  })
  @IsBoundedResult()
  result!: Record<string, unknown>;
}
