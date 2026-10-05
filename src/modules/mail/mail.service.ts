import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import nodemailer, { type Transporter } from "nodemailer";
import type { AppointmentModel } from "../../generated/prisma/models";
import { PrismaService } from "../../database/prisma.service";
import {
  type CalendarLinks,
  buildCalendarLinks,
} from "../appointments/calendar-links";
import {
  APPOINTMENT_TYPE_ENUM,
  TIMEZONE_IANA,
} from "../appointments/appointments.constants";
import { normalizeMessageId } from "./message-id";
import {
  BRAND_FROM,
  type AppointmentLinks,
  type MailContent,
  buildBookingEmails,
  buildCancellationEmails,
  buildReminderEmails,
  buildRescheduleEmails,
  getEmailLogoAttachment,
} from "./mail.templates";

type MailConfig = {
  host?: string;
  port: number;
  user?: string;
  pass?: string;
  from?: string;
  notifyTo?: string;
  dryRun: boolean;
  baseUrl: string;
  apiUrl: string;
};

/** Which template went out. Kept as a plain string column so a new template
 *  type does not require an enum migration. */
export type EmailKind =
  | "BOOKING_CONFIRMATION"
  | "BOOKING_ADMIN_NOTIFICATION"
  | "RESCHEDULE_CONFIRMATION"
  | "RESCHEDULE_ADMIN_NOTIFICATION"
  | "CANCELLATION_CONFIRMATION"
  | "CANCELLATION_ADMIN_NOTIFICATION"
  | "REMINDER_24H"
  | "REMINDER_1H";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;
  private readonly cfg: MailConfig;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.cfg = {
      host: config.get<string>("mail.host"),
      port: config.get<number>("mail.port") ?? 587,
      user: config.get<string>("mail.user"),
      pass: config.get<string>("mail.pass"),
      from: config.get<string>("mail.from"),
      notifyTo: config.get<string>("mail.notifyTo"),
      dryRun: config.get<boolean>("mail.dryRun") ?? false,
      baseUrl:
        config.get<string>("app.frontendUrl") ??
        config.get<string>("app.url") ??
        "http://localhost:3000",
      apiUrl: config.get<string>("app.url") ?? "http://localhost:3001",
    };
  }

  private getTransporter(): Transporter | null {
    const { host, port, user, pass } = this.cfg;
    if (!host || !user || !pass) {
      this.logger.warn(
        "SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS) — email skipped",
      );
      return null;
    }
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
    return this.transporter;
  }

  private logoAttachment(): object[] {
    try {
      return [getEmailLogoAttachment()];
    } catch {
      return [];
    }
  }

  private async send(
    to: string,
    content: MailContent,
    context?: { appointmentId?: string; kind: EmailKind },
  ): Promise<boolean> {
    const { from, dryRun } = this.cfg;
    if (!from || !to) {
      this.logger.warn(
        `Email skipped — missing from/to (from=${from}, to=${to})`,
      );
      return false;
    }

    if (dryRun) {
      this.logger.log(`[dry-run] subject="${content.subject}" → ${to}`);
      return true;
    }

    const transporter = this.getTransporter();
    if (!transporter) return false;

    try {
      const info = await transporter.sendMail({
        from: `"${BRAND_FROM}" <${from}>`,
        to,
        subject: content.subject,
        text: content.text,
        html: content.html,
        attachments: this.logoAttachment(),
      });

      // sendMail() resolves the moment the provider accepts the message, so
      // this is "accepted", never "delivered". messageId is the only handle a
      // later delivery webhook can match on, so it is stored now — a bounce
      // arriving in ten minutes has nothing to join against otherwise.
      await this.recordDelivery(to, content, context, info);

      this.logger.log(
        `Email sent → ${to} (${content.subject})` +
          (normalizeMessageId(info?.messageId) ? "" : " [no messageId]"),
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Email failed → ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Best-effort persistence: a tracking-write failure must never turn a
   * delivered email into a retry, because the caller would then send it twice.
   */
  private async recordDelivery(
    to: string,
    content: MailContent,
    context: { appointmentId?: string; kind: EmailKind } | undefined,
    // nodemailer types SentMessageInfo as `any`, so only the one field we rely
    // on is described here.
    info: { messageId?: unknown } | undefined,
  ): Promise<void> {
    if (!context) return;

    const messageId = normalizeMessageId(info?.messageId);

    try {
      await this.prisma.emailDelivery.create({
        data: {
          appointmentId: context.appointmentId ?? null,
          messageId,
          kind: context.kind,
          recipient: to,
          subject: content.subject.slice(0, 255),
        },
      });
    } catch (error) {
      this.logger.error(
        `Could not record email delivery for ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async sendBookingNotifications(
    appointment: AppointmentModel,
  ): Promise<boolean> {
    if (!this.cfg.notifyTo) {
      this.logger.warn("SMTP_TO not set — admin notification skipped");
    }
    const emails = buildBookingEmails(
      this.toMailData(appointment),
      this.links(appointment),
    );
    const prospectSent = await this.send(appointment.email, emails.prospect, {
      appointmentId: appointment.id,
      kind: "BOOKING_CONFIRMATION",
    });
    if (this.cfg.notifyTo) {
      await this.send(this.cfg.notifyTo, emails.admin, {
        appointmentId: appointment.id,
        kind: "BOOKING_ADMIN_NOTIFICATION",
      });
    }
    return prospectSent;
  }

  async sendRescheduleNotifications(
    appointment: AppointmentModel,
    previousUtc: Date,
  ): Promise<boolean> {
    const emails = buildRescheduleEmails(
      this.toMailData(appointment),
      this.links(appointment),
      this.describeTime(previousUtc, appointment.prospectTimezone),
    );
    const prospectSent = await this.send(appointment.email, emails.prospect, {
      appointmentId: appointment.id,
      kind: "RESCHEDULE_CONFIRMATION",
    });
    if (this.cfg.notifyTo) {
      await this.send(this.cfg.notifyTo, emails.admin, {
        appointmentId: appointment.id,
        kind: "RESCHEDULE_ADMIN_NOTIFICATION",
      });
    }
    return prospectSent;
  }

  async sendCancellationNotifications(
    appointment: AppointmentModel,
  ): Promise<boolean> {
    const emails = buildCancellationEmails(
      this.toMailData(appointment),
      this.links(appointment),
      appointment.cancellationReason ?? undefined,
    );
    const prospectSent = await this.send(appointment.email, emails.prospect, {
      appointmentId: appointment.id,
      kind: "CANCELLATION_CONFIRMATION",
    });
    if (this.cfg.notifyTo) {
      await this.send(this.cfg.notifyTo, emails.admin, {
        appointmentId: appointment.id,
        kind: "CANCELLATION_ADMIN_NOTIFICATION",
      });
    }
    return prospectSent;
  }

  async sendReminderNotifications(
    appointment: AppointmentModel,
    hoursBefore: number,
  ): Promise<boolean> {
    const emails = buildReminderEmails(
      this.toMailData(appointment),
      this.links(appointment),
      hoursBefore,
    );
    return this.send(appointment.email, emails.prospect, {
      appointmentId: appointment.id,
      kind: hoursBefore === 24 ? "REMINDER_24H" : "REMINDER_1H",
    });
  }

  private toMailData(appointment: AppointmentModel): {
    contactName: string;
    companyName: string;
    email: string;
    appointmentType: string;
    date: string;
    time: string;
    timezone: string;
    duration: string;
  } {
    const label =
      (Object.entries(APPOINTMENT_TYPE_ENUM).find(
        ([, value]) => value === appointment.appointmentType,
      )?.[0] as string) ?? String(appointment.appointmentType);

    const timezone = appointment.prospectTimezone ?? "UTC";
    const { date, time } = this.splitTime(appointment.scheduledAtUtc, timezone);

    return {
      contactName: appointment.contactName,
      companyName: appointment.companyName,
      email: appointment.email,
      appointmentType: label,
      date,
      time,
      timezone,
      duration: `${appointment.durationMinutes} minutes`,
    };
  }

  private describeTime(utc: Date, timezoneLabel: string): string {
    const { date, time } = this.splitTime(utc, timezoneLabel ?? "UTC");
    return `${date} ${time} ${timezoneLabel ? `(${timezoneLabel})` : ""}`.trim();
  }

  private splitTime(
    utc: Date,
    timezoneLabel: string,
  ): { date: string; time: string } {
    const iana = TIMEZONE_IANA[timezoneLabel] ?? "UTC";
    const wall = toZonedTime(utc, iana);
    return {
      date: format(wall, "yyyy-MM-dd"),
      time: format(wall, "hh:mm a"),
    };
  }

  rescheduleLink(appointment: AppointmentModel): string {
    return `${this.cfg.baseUrl.replace(/\/+$/, "")}/appointments/reschedule/${appointment.rescheduleToken}`;
  }

  calendarLinks(appointment: AppointmentModel): CalendarLinks {
    return buildCalendarLinks(appointment, {
      apiUrl: this.cfg.apiUrl,
      rescheduleUrl: this.rescheduleLink(appointment),
    });
  }

  private links(appointment: AppointmentModel): AppointmentLinks {
    const base = this.cfg.baseUrl.replace(/\/+$/, "");
    return {
      reschedule: `${base}/appointments/reschedule/${appointment.rescheduleToken}`,
      cancel: `${base}/appointments/cancel/${appointment.cancelToken}`,
      calendar: this.calendarLinks(appointment),
    };
  }
}
