import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { AppointmentModel } from "../../generated/prisma/models";
import { TIMEZONE_IANA } from "./appointments.constants";
import { appointmentTypeLabel } from "./calendar-ics";

const ORGANIZER = "NORTH POINT SALES GROUP";
const LOCATION = "Contact: contact@northpointsalesgroup.com";

export type CalendarEventDetails = {
  summary: string;
  description: string;
  location: string;
  startUtc: Date;
  endUtc: Date;
  iana: string;
  timezoneLabel: string;
  when: string;
};

/**
 * Single source of truth for the human-readable parts of a calendar event, so
 * the .ics file, the Google link and the Outlook link can never drift apart.
 */
export function calendarEventDetails(
  appointment: AppointmentModel,
  options: { rescheduleUrl: string },
): CalendarEventDetails {
  const start = new Date(appointment.scheduledAtUtc);
  const end = new Date(
    start.getTime() + (appointment.durationMinutes || 30) * 60 * 1000,
  );

  const timezoneLabel = appointment.prospectTimezone || "UTC";
  const iana = TIMEZONE_IANA[timezoneLabel] ?? "UTC";
  const wall = toZonedTime(start, iana);
  const when = `${format(wall, "yyyy-MM-dd")} ${format(wall, "hh:mm a")}`;
  const typeLabel = appointmentTypeLabel(appointment.appointmentType);

  const summary = `${typeLabel} with ${ORGANIZER}`;
  const description = [
    `${typeLabel} with ${ORGANIZER}.`,
    `When: ${when} (${timezoneLabel})`,
    `Contact: ${appointment.contactName}${appointment.companyName ? ` — ${appointment.companyName}` : ""}`,
    `Need to change this? Reschedule: ${options.rescheduleUrl}`,
  ].join("\n");

  return {
    summary,
    description,
    location: LOCATION,
    startUtc: start,
    endUtc: end,
    iana,
    timezoneLabel,
    when,
  };
}

/** Google Calendar compact UTC form: 20261220T150000Z */
function compactUtc(date: Date): string {
  return date
    .toISOString()
    .replaceAll(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export function buildGoogleCalendarUrl(details: CalendarEventDetails): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: details.summary,
    dates: `${compactUtc(details.startUtc)}/${compactUtc(details.endUtc)}`,
    details: details.description,
    location: details.location,
    ctz: details.iana,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookCalendarUrl(details: CalendarEventDetails): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: details.summary,
    startdt: details.startUtc.toISOString(),
    enddt: details.endUtc.toISOString(),
    body: details.description,
    location: details.location,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export type CalendarLinks = {
  google: string;
  outlook: string;
  ics: string;
};

/**
 * Three ways to get the event onto a calendar without forcing a file download:
 * Google and Outlook open their own composer in the browser, while the .ics
 * link stays as a manual-import fallback (Apple Calendar, desktop clients).
 */
export function buildCalendarLinks(
  appointment: AppointmentModel,
  options: { apiUrl: string; rescheduleUrl: string },
): CalendarLinks {
  const details = calendarEventDetails(appointment, {
    rescheduleUrl: options.rescheduleUrl,
  });
  const api = options.apiUrl.replace(/\/+$/, "");

  return {
    google: buildGoogleCalendarUrl(details),
    outlook: buildOutlookCalendarUrl(details),
    ics: `${api}/api/v1/appointments/${appointment.rescheduleToken}/calendar.ics`,
  };
}
