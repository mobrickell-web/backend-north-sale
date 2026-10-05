import type { AppointmentType } from "../../generated/prisma/enums";

export const APPOINTMENT_TYPE_LABELS = [
  "Initial Consultation",
  "Sales Performance Discussion",
  "Sales Performance Review",
  "Follow-Up Meeting",
] as const;

export const APPOINTMENT_TYPE_ENUM: Record<string, AppointmentType> = {
  "Initial Consultation": "INITIAL_CONSULTATION",
  "Sales Performance Discussion": "SALES_PERFORMANCE_DISCUSSION",
  "Sales Performance Review": "SALES_PERFORMANCE_REVIEW",
  "Follow-Up Meeting": "FOLLOW_UP_MEETING",
};

export const TIME_SLOTS = [
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
] as const;

export const REMINDER_OFFSETS = [24, 1] as const;

export type ReminderOffsetHours = (typeof REMINDER_OFFSETS)[number];

export const DURATIONS = ["30 minutes", "45 minutes", "60 minutes"] as const;

export const DURATION_MINUTES: Record<string, number> = {
  "30 minutes": 30,
  "45 minutes": 45,
  "60 minutes": 60,
};

export const TIMEZONE_LABELS = [
  "Eastern Time (ET) — US East Coast",
  "Central Time (CT) — US Central",
  "Mountain Time (MT) — US Mountain",
  "Mountain Time (MT) — Arizona (no daylight saving)",
  "Pacific Time (PT) — US West Coast",
  "Alaska Time (AKT) — Alaska",
  "Hawaii-Aleutian Time (HAT) — Aleutian Islands, Alaska",
  "Hawaii Time (HT) — Hawaii",
  "Atlantic Time (AST) — Puerto Rico & US Virgin Islands",
  "Chamorro Time (ChST) — Guam & Northern Mariana Islands",
  "Samoa Time (SST) — American Samoa",
] as const;

export const TIMEZONE_IANA: Record<string, string> = {
  "Eastern Time (ET) — US East Coast": "America/New_York",
  "Central Time (CT) — US Central": "America/Chicago",
  "Mountain Time (MT) — US Mountain": "America/Denver",
  "Mountain Time (MT) — Arizona (no daylight saving)": "America/Phoenix",
  "Pacific Time (PT) — US West Coast": "America/Los_Angeles",
  "Alaska Time (AKT) — Alaska": "America/Anchorage",
  "Hawaii-Aleutian Time (HAT) — Aleutian Islands, Alaska": "America/Adak",
  "Hawaii Time (HT) — Hawaii": "Pacific/Honolulu",
  "Atlantic Time (AST) — Puerto Rico & US Virgin Islands":
    "America/Puerto_Rico",
  "Chamorro Time (ChST) — Guam & Northern Mariana Islands": "Pacific/Guam",
  "Samoa Time (SST) — American Samoa": "Pacific/Pago_Pago",
};
