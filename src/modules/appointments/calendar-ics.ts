import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { AppointmentModel } from "../../generated/prisma/models";
import { APPOINTMENT_TYPE_ENUM, TIMEZONE_IANA } from "./appointments.constants";
import { calendarEventDetails } from "./calendar-links";

const PRODID = "-//NORTH POINT SALES GROUP//Appointments//EN";
const ORGANIZER = "mailto:contact@northpointsalesgroup.com";
const CRLF = "\r\n";

/** Escape a value for an iCalendar TEXT property (RFC 5545 3.3.11). */
function escapeIcsText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\n")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}

/** Fold a content line to 75 octets, continuing with a leading space (RFC 5545 3.1). */
function fold(line: string): string {
  if (Buffer.byteLength(line, "utf8") <= 75) {
    return line;
  }

  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const char of line) {
    const charBytes = Buffer.byteLength(char, "utf8");
    const limit = parts.length === 0 ? 75 : 74;

    if (currentBytes + charBytes > limit) {
      parts.push(current);
      current = char;
      currentBytes = charBytes;
      continue;
    }

    current += char;
    currentBytes += charBytes;
  }

  if (current) {
    parts.push(current);
  }

  return parts.join(CRLF + " ");
}

function toIcsUtc(date: Date): string {
  return date
    .toISOString()
    .replaceAll(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export function appointmentTypeLabel(appointmentType: string): string {
  return (
    Object.entries(APPOINTMENT_TYPE_ENUM).find(
      ([, value]) => value === appointmentType,
    )?.[0] ?? appointmentType
  );
}

export function buildCalendarIcs(
  appointment: AppointmentModel,
  options: { rescheduleUrl: string },
): string {
  const details = calendarEventDetails(appointment, options);
  const { summary, description, startUtc: start, endUtc: end } = details;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${appointment.rescheduleToken}@northpointsalesgroup.com`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    fold(`SUMMARY:${escapeIcsText(summary)}`),
    fold(`DESCRIPTION:${escapeIcsText(description)}`),
    `URL:${options.rescheduleUrl}`,
    `ORGANIZER;CN=NORTH POINT SALES GROUP:${ORGANIZER}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText(summary)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.join(CRLF)}${CRLF}`;
}

export function calendarFileName(appointment: AppointmentModel): string {
  const safeType = appointmentTypeLabel(appointment.appointmentType)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");

  const iana = TIMEZONE_IANA[appointment.prospectTimezone] ?? "UTC";
  const wall = toZonedTime(appointment.scheduledAtUtc, iana);

  return `north-point-sales-${safeType || "appointment"}-${format(wall, "yyyy-MM-dd-HHmm")}.ics`;
}
