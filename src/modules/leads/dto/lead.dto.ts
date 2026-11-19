import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";
import {
  AnnualGrossRevenueKind,
  ExistingSalesForce,
  LeadActivityType,
  LeadStatus,
} from "../../../generated/prisma/enums";

export { AnnualGrossRevenueKind, ExistingSalesForce };

/** A12 — client labels for Annual Gross Revenue kind. */
export const ANNUAL_GROSS_REVENUE_KIND_LABELS: Record<
  AnnualGrossRevenueKind,
  string
> = {
  [AnnualGrossRevenueKind.REPORTED]: "Reported",
  [AnnualGrossRevenueKind.ESTIMATED]: "Estimated",
  [AnnualGrossRevenueKind.UNKNOWN]: "Unknown",
};

/** A12 — client labels for Existing Sales Force. */
export const EXISTING_SALES_FORCE_LABELS: Record<ExistingSalesForce, string> = {
  [ExistingSalesForce.YES]: "Yes",
  [ExistingSalesForce.NO]: "No",
  [ExistingSalesForce.UNKNOWN]: "Unknown",
};

function toOptionalInt(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return value as number;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true" || value === 1 || value === "1") {
    return true;
  }
  if (value === false || value === "false" || value === 0 || value === "0") {
    return false;
  }
  return undefined;
}

/** Empty strings skip format checks so a PATCH can clear an optional field. */
const isNonEmpty = (_object: object, value: unknown): boolean => value !== "";

export { LeadStatus };

/** Client-facing Current Status labels (A8 + A13 + A14 Do Not Contact). */
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.NEW_PROSPECT]: "New Prospect",
  [LeadStatus.NO_ANSWER]: "No Answer",
  [LeadStatus.GATEKEEPER_REACHED]: "Gatekeeper Reached",
  [LeadStatus.DECISION_MAKER_REACHED]: "Decision Maker Reached",
  [LeadStatus.CALLBACK_REQUIRED]: "Callback Required",
  [LeadStatus.INTERESTED]: "Interested",
  [LeadStatus.ZOOM_SCHEDULED]: "Zoom Scheduled",
  [LeadStatus.APPOINTMENT_COMPLETED]: "Appointment Completed",
  [LeadStatus.PROPOSAL_SENT]: "Proposal Sent",
  [LeadStatus.CLIENT_ACQUIRED]: "Client Acquired",
  [LeadStatus.NOT_INTERESTED]: "Not Interested",
  [LeadStatus.NOT_QUALIFIED]: "Not Qualified",
  [LeadStatus.DO_NOT_CONTACT]: "Do Not Contact",
};

export class CreateLeadDto {
  @ApiProperty({
    example: "Acme Manufacturing",
    description: "Required. Company name for the lead.",
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  companyName!: string;

  @ApiPropertyOptional({
    description:
      "A11 — Assigned EADS id. Master Admin: omit for unassigned, or set to assign. EADS create always self (ignored).",
  })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({
    maxLength: 150,
    description: "Optional general contact name (legacy-compatible).",
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @ValidateIf(isNonEmpty)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  address?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  gatekeeperName?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  gatekeeperPhone?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  decisionMakerName?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @ValidateIf(isNonEmpty)
  @IsEmail()
  @MaxLength(255)
  decisionMakerEmail?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  decisionMakerPhone?: string;

  @ApiPropertyOptional({
    maxLength: 100,
    description: "A12 — Annual Gross Revenue amount (free-text as entered)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  annualRevenue?: string;

  @ApiPropertyOptional({
    enum: AnnualGrossRevenueKind,
    description: "A12 — Reported / Estimated / Unknown",
  })
  @IsOptional()
  @IsEnum(AnnualGrossRevenueKind)
  annualGrossRevenueKind?: AnnualGrossRevenueKind;

  @ApiPropertyOptional({
    enum: ExistingSalesForce,
    description: "A12 — Existing Sales Force Yes / No / Unknown",
  })
  @IsOptional()
  @IsEnum(ExistingSalesForce)
  existingSalesForce?: ExistingSalesForce;

  @ApiPropertyOptional({
    description: "A12 — Number of Sales Representatives",
    minimum: 0,
    maximum: 99999,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  @Min(0)
  @Max(99999)
  numberOfSalesRepresentatives?: number | null;

  @ApiPropertyOptional({
    maxLength: 100,
    description:
      "Legacy free-text sales-force size (prefer numberOfSalesRepresentatives)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  salesForceSize?: string;

  @ApiPropertyOptional({
    maxLength: 150,
    description: "A12 — Lead Source (free-text)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  leadSource?: string;

  @ApiPropertyOptional({
    enum: LeadStatus,
    default: LeadStatus.NEW_PROSPECT,
    description: "Current Status (A8 + A13 Appointment Completed)",
  })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({
    description: "Required when status is NOT_QUALIFIED",
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notQualifiedReason?: string;

  @ApiPropertyOptional({
    description: "ISO datetime; required when status is CALLBACK_REQUIRED",
  })
  @IsOptional()
  @IsDateString()
  followUpAt?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  followUpNotes?: string;

  @ApiPropertyOptional({
    description: "ISO datetime; required when status is ZOOM_SCHEDULED",
  })
  @IsOptional()
  @IsDateString()
  appointmentAt?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  appointmentNotes?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional({
    description:
      "Set true after reviewing duplicate warnings to proceed with create",
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  acknowledgeDuplicates?: boolean;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({
    description:
      "A11 — Reassign owner (Master Admin only). Empty string clears to unassigned.",
  })
  @IsOptional()
  @ValidateIf(isNonEmpty)
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({
    maxLength: 255,
    description: "Empty string clears the website",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({
    maxLength: 150,
    description: "Empty string clears the contact name",
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    maxLength: 255,
    description: "Empty string clears the email",
  })
  @IsOptional()
  @IsString()
  @ValidateIf(isNonEmpty)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    maxLength: 50,
    description: "Empty string clears the phone",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    maxLength: 2000,
    description: "Empty string clears the address",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  address?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  gatekeeperName?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  gatekeeperPhone?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  decisionMakerName?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @ValidateIf(isNonEmpty)
  @IsEmail()
  @MaxLength(255)
  decisionMakerEmail?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  decisionMakerPhone?: string;

  @ApiPropertyOptional({
    maxLength: 100,
    description: "A12 — Annual Gross Revenue amount; empty string clears",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  annualRevenue?: string;

  @ApiPropertyOptional({
    enum: AnnualGrossRevenueKind,
    description: "A12 — Reported / Estimated / Unknown; empty string clears",
  })
  @IsOptional()
  @ValidateIf(isNonEmpty)
  @IsEnum(AnnualGrossRevenueKind)
  annualGrossRevenueKind?: AnnualGrossRevenueKind | "";

  @ApiPropertyOptional({
    enum: ExistingSalesForce,
    description: "A12 — Existing Sales Force; empty string clears",
  })
  @IsOptional()
  @ValidateIf(isNonEmpty)
  @IsEnum(ExistingSalesForce)
  existingSalesForce?: ExistingSalesForce | "";

  @ApiPropertyOptional({
    description:
      "A12 — Number of Sales Representatives; empty string / null clears",
    nullable: true,
    minimum: 0,
    maximum: 99999,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  @Min(0)
  @Max(99999)
  numberOfSalesRepresentatives?: number | null;

  @ApiPropertyOptional({
    maxLength: 100,
    description: "Legacy free-text sales-force size; empty string clears",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  salesForceSize?: string;

  @ApiPropertyOptional({
    maxLength: 150,
    description: "A12 — Lead Source; empty string clears",
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  leadSource?: string;

  @ApiPropertyOptional({
    enum: LeadStatus,
    description: "Current Status (A8 + A13 Appointment Completed)",
  })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({
    description: "Empty string clears; required when status is NOT_QUALIFIED",
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notQualifiedReason?: string;

  @ApiPropertyOptional({
    description:
      "ISO datetime or empty string to clear; required when status is CALLBACK_REQUIRED",
  })
  @IsOptional()
  @ValidateIf(isNonEmpty)
  @IsDateString()
  followUpAt?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  followUpNotes?: string;

  @ApiPropertyOptional({
    description:
      "ISO datetime or empty string to clear; required when status is ZOOM_SCHEDULED",
  })
  @IsOptional()
  @ValidateIf(isNonEmpty)
  @IsDateString()
  appointmentAt?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  appointmentNotes?: string;

  @ApiPropertyOptional({
    maxLength: 5000,
    description: "Empty string clears the notes",
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional({
    description:
      "Set true after reviewing duplicate warnings to proceed with update",
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  acknowledgeDuplicates?: boolean;
}

/** Soft duplicate preview (company / website / phone). */
export class CheckLeadDuplicatesQueryDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    description: "Exclude this lead id (use when editing)",
  })
  @IsOptional()
  @IsUUID()
  excludeId?: string;
}

/** Click-through buckets matching GET /leads/totals cards. */
export const LEAD_LIST_FILTERS = [
  "active",
  "follow_ups_due_today",
  "follow_ups_overdue",
  "upcoming_appointments",
] as const;

export type LeadListFilter = (typeof LEAD_LIST_FILTERS)[number];

export class ListLeadsQueryDto {
  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({
    description:
      "Case-insensitive search across company, contact names, email, phone, website, address, notes",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({
    description: "Filter by assigned rep (Master Admin only)",
  })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({
    enum: LEAD_LIST_FILTERS,
    description:
      "Dashboard click-through filter. Matches totals buckets (manual CRM only; no website bookings).",
  })
  @IsOptional()
  @IsIn(LEAD_LIST_FILTERS)
  filter?: LeadListFilter;
}

// ---------------------------------------------------------------------------
// A4 — Assign / reassign (Master Admin)
// ---------------------------------------------------------------------------

export class AssignLeadDto {
  @ApiProperty({
    description:
      "A11 — Active EADS / Sales Representative id. Assigns unassigned leads or reassigns owned ones (Master Admin only).",
    format: "uuid",
  })
  @IsUUID()
  ownerId!: string;
}

// ---------------------------------------------------------------------------
// A2 — Activities (append-only call / email / meeting / note)
// ---------------------------------------------------------------------------

/** User-creatable activity types (system writes follow-up / reassign entries). */
export const MANUAL_LEAD_ACTIVITY_TYPES = [
  LeadActivityType.NOTE,
  LeadActivityType.CALL,
  LeadActivityType.EMAIL,
  LeadActivityType.MEETING,
] as const;

export type ManualLeadActivityType =
  (typeof MANUAL_LEAD_ACTIVITY_TYPES)[number];

export { LeadActivityType };

export class CreateLeadActivityDto {
  @ApiProperty({
    enum: MANUAL_LEAD_ACTIVITY_TYPES,
    example: LeadActivityType.CALL,
  })
  @IsIn(MANUAL_LEAD_ACTIVITY_TYPES)
  type!: ManualLeadActivityType;

  @ApiProperty({
    minLength: 1,
    maxLength: 10000,
    example: "Left voicemail; will try again Thursday.",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;
}

// ---------------------------------------------------------------------------
// A9 — Call disposition log (append-only; separate from Current Status)
// ---------------------------------------------------------------------------

export class CreateLeadCallDto {
  @ApiProperty({
    enum: LeadStatus,
    example: LeadStatus.NO_ANSWER,
    description:
      "Disposition for this call (permanent). Uses Current Status values (incl. Appointment Completed).",
  })
  @IsEnum(LeadStatus)
  disposition!: LeadStatus;

  @ApiProperty({
    minLength: 1,
    maxLength: 10000,
    example: "Left voicemail with gatekeeper; asked to call back Thursday.",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  notes!: string;

  @ApiPropertyOptional({
    description: "Next follow-up noted on this call (ISO datetime)",
    example: "2026-11-20T15:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  followUpAt?: string;

  @ApiPropertyOptional({
    description:
      "When true, also set the lead Current Status to this disposition. Past call rows are never overwritten.",
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  updateCurrentStatus?: boolean;

  @ApiPropertyOptional({
    description: "A10 — Contact spoken to (must belong to this lead)",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  contactId?: string;
}

// ---------------------------------------------------------------------------
// A10 — Contacts under a company/prospect
// ---------------------------------------------------------------------------

export class CreateLeadContactDto {
  @ApiProperty({ example: "Jordan Lee", minLength: 1, maxLength: 150 })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: "Sales Manager", maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional({ example: "+1 555 0100", maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: "jordan@acme.com", maxLength: 255 })
  @IsOptional()
  @IsString()
  @ValidateIf(isNonEmpty)
  @IsEmail()
  @MaxLength(255)
  email?: string;
}

export class UpdateLeadContactDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 150 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    maxLength: 150,
    description: "Empty string clears title",
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional({
    maxLength: 50,
    description: "Empty string clears phone",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    maxLength: 255,
    description: "Empty string clears email",
  })
  @IsOptional()
  @IsString()
  @ValidateIf(isNonEmpty)
  @IsEmail()
  @MaxLength(255)
  email?: string;
}

// ---------------------------------------------------------------------------
// A2 — Follow-ups (schedule; complete uses path params only)
// ---------------------------------------------------------------------------

export class CreateLeadFollowUpDto {
  @ApiProperty({
    description: "When the follow-up is due (ISO datetime)",
    example: "2026-11-18T15:00:00.000Z",
  })
  @IsDateString()
  dueAt!: string;

  @ApiPropertyOptional({
    maxLength: 5000,
    example: "Call decision maker about proposal timing.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

// ---------------------------------------------------------------------------
// A13 — Mark manual CRM appointment completed
// ---------------------------------------------------------------------------

export class CompleteLeadAppointmentDto {
  @ApiPropertyOptional({
    maxLength: 5000,
    description: "Optional note stored on the timeline activity",
    example: "Met with decision maker; sending proposal next.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
