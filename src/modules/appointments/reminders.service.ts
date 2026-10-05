import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import type { AppointmentModel } from "../../generated/prisma/models";
import { PrismaService } from "../../database/prisma.service";
import { MailService } from "../mail/mail.service";
import {
  REMINDER_OFFSETS,
  type ReminderOffsetHours,
} from "./appointments.constants";

/** Statuses that may still receive a reminder. CANCELLED/COMPLETED/NO_SHOW are terminal. */
const REMINDER_ELIGIBLE_STATUSES = ["CONFIRMED", "RESCHEDULED"] as const;

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);
  private readonly enabled: boolean;
  private readonly lookbackMinutes: number;
  private ticking = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    config: ConfigService,
  ) {
    this.enabled = config.get<boolean>("reminders.enabled") ?? true;
    this.lookbackMinutes = config.get<number>("reminders.lookbackMinutes") ?? 5;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleReminders(): Promise<void> {
    if (!this.enabled) return;

    // A slow SMTP call must not let the next tick pile up on top of this one.
    if (this.ticking) {
      this.logger.debug("Reminder tick skipped — previous tick still running");
      return;
    }

    this.ticking = true;
    try {
      for (const hours of REMINDER_OFFSETS) {
        await this.sendDueReminders(hours);
      }
    } catch (error) {
      this.logger.error(
        `Reminder tick failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.ticking = false;
    }
  }

  private async sendDueReminders(hours: ReminderOffsetHours): Promise<void> {
    const now = new Date();
    const offsetMs = hours * 60 * 60 * 1000;

    // Only appointments that crossed this offset within the lookback window are
    // eligible. A narrower window means a reminder missed while the server was
    // down is skipped rather than firing late in bulk.
    //
    // The window must be anchored to the offset crossing point (now + offset),
    // not to now. Anchoring to now would widen the range by the full offset and
    // fire the 24h reminder for any appointment booked less than 24h ahead.
    const offsetDue = new Date(now.getTime() + offsetMs);
    const windowStart = new Date(
      offsetDue.getTime() - this.lookbackMinutes * 60_000,
    );

    const sentField = hours === 24 ? "reminder24hSent" : "reminder1hSent";
    const sentAtField = hours === 24 ? "reminder24hSentAt" : "reminder1hSentAt";

    const due = await this.prisma.appointment.findMany({
      where: {
        status: { in: [...REMINDER_ELIGIBLE_STATUSES] },
        scheduledAtUtc: { gt: windowStart, lte: offsetDue },
        [sentField]: false,
      },
    });

    if (due.length === 0) return;

    this.logger.log(
      `${due.length} appointment(s) due for a ${hours}h reminder`,
    );

    for (const appointment of due) {
      try {
        await this.deliver(appointment, hours, sentField, sentAtField);
      } catch (error) {
        this.logger.error(
          `Reminder delivery failed for appointment ${appointment.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async deliver(
    appointment: AppointmentModel,
    hours: ReminderOffsetHours,
    sentField: "reminder24hSent" | "reminder1hSent",
    sentAtField: "reminder24hSentAt" | "reminder1hSentAt",
  ): Promise<void> {
    // Claim the row first. updateMany is a single conditional statement, so when
    // more than one API instance is running only one of them wins the row.
    const claim = await this.prisma.appointment.updateMany({
      where: { id: appointment.id, [sentField]: false },
      data: { [sentField]: true, [sentAtField]: new Date() },
    });

    if (claim.count === 0) return;

    const sent = await this.mailService.sendReminderNotifications(
      appointment,
      hours,
    );

    if (!sent) {
      // Release the claim so the next tick can retry while the window is open.
      await this.prisma.appointment.updateMany({
        where: { id: appointment.id, [sentField]: true },
        data: { [sentField]: false, [sentAtField]: null },
      });
      this.logger.warn(
        `${hours}h reminder not sent for appointment ${appointment.id} — will retry`,
      );
      return;
    }

    await this.prisma.appointmentLog.create({
      data: {
        appointmentId: appointment.id,
        action: hours === 24 ? "REMINDER_24H_SENT" : "REMINDER_1H_SENT",
        previousTime: null,
        newTime: appointment.scheduledAtUtc,
        notes: `${hours}h reminder email sent to ${appointment.email}`,
      },
    });

    this.logger.log(`${hours}h reminder sent → ${appointment.email}`);
  }
}
