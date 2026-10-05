import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import {
  APPOINTMENT_TYPE_LABELS,
  DURATIONS,
  TIME_SLOTS,
  TIMEZONE_LABELS,
} from "../appointments.constants";

export class CreateAppointmentDto {
  @ApiProperty({ example: "John Smith" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  contactName!: string;

  @ApiProperty({ example: "Acme Corporation" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  companyName!: string;

  @ApiProperty({ example: "john.smith@acme.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: "Initial Consultation",
    enum: [...APPOINTMENT_TYPE_LABELS],
  })
  @IsIn(APPOINTMENT_TYPE_LABELS)
  appointmentType!: string;

  @ApiProperty({ example: "2026-10-05" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "date must be in YYYY-MM-DD format",
  })
  date!: string;

  @ApiProperty({ example: "9:00 AM", enum: [...TIME_SLOTS] })
  @IsIn(TIME_SLOTS)
  time!: string;

  @ApiProperty({
    example: "Eastern Time (ET) — US East Coast",
    enum: [...TIMEZONE_LABELS],
  })
  @IsIn(TIMEZONE_LABELS)
  timezone!: string;

  @ApiProperty({ example: "30 minutes", enum: [...DURATIONS] })
  @IsIn(DURATIONS)
  duration!: string;
}

export class RescheduleAppointmentDto {
  @ApiProperty({ example: "2026-10-06" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "date must be in YYYY-MM-DD format",
  })
  date!: string;

  @ApiProperty({ example: "10:00 AM", enum: [...TIME_SLOTS] })
  @IsIn(TIME_SLOTS)
  time!: string;

  @ApiProperty({
    example: "Central Time (CT) — US Central",
    enum: [...TIMEZONE_LABELS],
  })
  @IsIn(TIMEZONE_LABELS)
  timezone!: string;
}

export class CancelAppointmentDto {
  @ApiPropertyOptional({ example: "Scheduling conflict on our side" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
