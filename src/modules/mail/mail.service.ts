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
  type ContactMessageDetails,
  type MailContent,
  buildBookingEmails,
  buildAuthVerificationEmail,
  buildCancellationEmails,
  buildContactEmail,
  buildReminderEmails,
  buildRescheduleEmails,
  getEmailLogoAttachment,
} from "./mail.templates";

const CONTACT_INBOX = "contact@northpointsalesgroup.com";

type MailConfig = {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
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
  | "REMINDER_1H"
  | "AUTH_SIGNUP_VERIFICATION"
  | "AUTH_PASSWORD_RESET";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly cfg: MailConfig;
  private readonly transporter?: Transporter;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.cfg = {
      smtpHost: config.get<string>("mail.smtpHost"),
      smtpPort: config.get<number>("mail.smtpPort"),
      smtpUser: config.get<string>("mail.smtpUser"),
      smtpPass: config.get<string>("mail.smtpPass"),
      from: config.get<string>("mail.from"),
      notifyTo: config.get<string>("mail.notifyTo"),
      dryRun: config.get<boolean>("mail.dryRun") ?? false,
      baseUrl:
        config.get<string>("app.frontendUrl") ??
        config.get<string>("app.url") ??
        "http://localhost:3000",
      apiUrl: config.get<string>("app.url") ?? "http://localhost:3001",
    };

    if (
      this.cfg.smtpHost &&
      this.cfg.smtpPort &&
      this.cfg.smtpUser &&
      this.cfg.smtpPass
    ) {
      this.transporter = nodemailer.createTransport({
        host: this.cfg.smtpHost,
        port: this.cfg.smtpPort,
        secure: this.cfg.smtpPort === 465,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 30_000,
        auth: {
          user: this.cfg.smtpUser,
          pass: this.cfg.smtpPass,
        },
      });
    }
  }

  private async send(
    to: string,
    content: MailContent,
    context?: { appointmentId?: string; kind: EmailKind },
    replyTo?: string,
  ): Promise<boolean> {
    const { from, dryRun } = this.cfg;
    if (!from || !to) {
      this.logger.warn("Email skipped — missing from/to configuration");
      return false;
    }

    if (dryRun) {
      this.logger.log(`[dry-run] subject="${content.subject}" → ${to}`);
      return true;
    }

    if (!this.transporter) {
      this.logger.warn(
        "SMTP is not fully configured — email could not be sent",
      );
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: { name: BRAND_FROM, address: from },
        to,
        ...(replyTo ? { replyTo } : {}),
        subject: content.subject,
        text: content.text,
        html: content.html,
        attachments: [getEmailLogoAttachment()],
      });

      await this.recordDelivery(to, content, context, info);
      this.logger.log(
        `Email accepted by SMTP → ${to} (${content.subject})` +
          (normalizeMessageId(info.messageId) ? "" : " [no messageId]"),
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Email failed → ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  private async recordDelivery(
    to: string,
    content: MailContent,
    context: { appointmentId?: string; kind: EmailKind } | undefined,
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

  async sendContactMessage(details: ContactMessageDetails): Promise<boolean> {
    const to = this.cfg.notifyTo ?? CONTACT_INBOX;
    return this.send(to, buildContactEmail(details), undefined, details.email);
  }

  async sendAuthVerificationCode(
    email: string,
    code: string,
    purpose: "SIGNUP" | "PASSWORD_RESET",
  ): Promise<boolean> {
    if (this.cfg.dryRun) {
      this.logger.warn(
        `Auth verification email was not sent because MAIL_DRY_RUN is enabled (${purpose})`,
      );
      return false;
    }
    return this.send(email, buildAuthVerificationEmail(code, purpose), {
      kind:
        purpose === "SIGNUP"
          ? "AUTH_SIGNUP_VERIFICATION"
          : "AUTH_PASSWORD_RESET",
    });
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
