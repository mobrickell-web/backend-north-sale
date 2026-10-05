import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { fromZonedTime } from "date-fns-tz";
import type { AppointmentModel } from "../../generated/prisma/models";
import type {
  ActionType,
  AppointmentStatus,
} from "../../generated/prisma/enums";
import { PrismaService } from "../../database/prisma.service";
import { MailService } from "../mail/mail.service";
import { buildCalendarIcs, calendarFileName } from "./calendar-ics";
import {
  APPOINTMENT_TYPE_ENUM,
  DURATION_MINUTES,
  TIMEZONE_IANA,
} from "./appointments.constants";
import {
  CancelAppointmentDto,
  CreateAppointmentDto,
  RescheduleAppointmentDto,
} from "./dto/create-appointment.dto";

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateAppointmentDto): Promise<AppointmentModel> {
    const scheduledAtUtc = this.toUtc(dto.date, dto.time, dto.timezone);

    if (scheduledAtUtc.getTime() <= Date.now()) {
      throw new BadRequestException(
        "The selected date and time is in the past",
      );
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        contactName: dto.contactName.trim(),
        companyName: dto.companyName.trim(),
        email: dto.email.trim().toLowerCase(),
        appointmentType: APPOINTMENT_TYPE_ENUM[dto.appointmentType],
        durationMinutes: DURATION_MINUTES[dto.duration],
        scheduledAtUtc,
        prospectTimezone: dto.timezone,
      },
    });

    await this.log(
      appointment.id,
      "BOOKED",
      null,
      scheduledAtUtc,
      "Booked via website form",
    );

    void this.sendBookingEmails(appointment);

    return appointment;
  }

  async manage(token: string): Promise<AppointmentModel> {
    this.assertUuidToken(token);
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        OR: [{ rescheduleToken: token }, { cancelToken: token }],
      },
    });
    if (!appointment) {
      throw new NotFoundException("Appointment not found");
    }
    return appointment;
  }

  async calendarIcs(token: string): Promise<{
    filename: string;
    content: string;
  }> {
    this.assertUuidToken(token);
    const appointment = await this.prisma.appointment.findUnique({
      where: { rescheduleToken: token },
    });

    if (!appointment) {
      throw new NotFoundException("Appointment not found");
    }

    return {
      filename: calendarFileName(appointment),
      content: buildCalendarIcs(appointment, {
        rescheduleUrl: this.mailService.rescheduleLink(appointment),
      }),
    };
  }

  async reschedule(
    token: string,
    dto: RescheduleAppointmentDto,
  ): Promise<AppointmentModel> {
    this.assertUuidToken(token);
    const appointment = await this.prisma.appointment.findUnique({
      where: { rescheduleToken: token },
    });

    if (!appointment) {
      throw new NotFoundException("Appointment not found");
    }
    this.assertMutable(appointment.status);

    const newScheduledAtUtc = this.toUtc(dto.date, dto.time, dto.timezone);

    if (newScheduledAtUtc.getTime() <= Date.now()) {
      throw new BadRequestException(
        "The selected date and time is in the past",
      );
    }
    if (newScheduledAtUtc.getTime() === appointment.scheduledAtUtc.getTime()) {
      throw new BadRequestException("No change in the appointment time");
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        scheduledAtUtc: newScheduledAtUtc,
        prospectTimezone: dto.timezone,
        status: "RESCHEDULED",
        // Reminder offsets are relative to scheduledAtUtc, so a moved appointment
        // needs a fresh pair of reminders against the new time.
        reminder24hSent: false,
        reminder24hSentAt: null,
        reminder1hSent: false,
        reminder1hSentAt: null,
      },
    });

    await this.log(
      appointment.id,
      "RESCHEDULED_BY_PROSPECT",
      appointment.scheduledAtUtc,
      newScheduledAtUtc,
      "Prospect rescheduled via email link",
    );

    void this.fireAndForget(
      "reschedule",
      this.mailService.sendRescheduleNotifications(
        updated,
        appointment.scheduledAtUtc,
      ),
    );

    return updated;
  }

  async cancel(
    token: string,
    dto?: CancelAppointmentDto,
  ): Promise<AppointmentModel> {
    this.assertUuidToken(token);
    const appointment = await this.prisma.appointment.findUnique({
      where: { cancelToken: token },
    });

    if (!appointment) {
      throw new NotFoundException("Appointment not found");
    }
    if (appointment.status === "CANCELLED") {
      return appointment;
    }
    this.assertMutable(appointment.status);

    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CANCELLED",
        cancellationReason: dto?.reason?.trim() ?? null,
      },
    });

    await this.log(
      appointment.id,
      "CANCELLED_BY_PROSPECT",
      appointment.scheduledAtUtc,
      null,
      dto?.reason?.trim() ?? "Cancelled via email link",
    );

    void this.fireAndForget(
      "cancellation",
      this.mailService.sendCancellationNotifications(updated),
    );

    return updated;
  }

  private async sendBookingEmails(
    appointment: AppointmentModel,
  ): Promise<void> {
    try {
      const sent = await this.mailService.sendBookingNotifications(appointment);
      if (sent) {
        await this.log(
          appointment.id,
          "CONFIRMATION_EMAIL_SENT",
          null,
          appointment.scheduledAtUtc,
          "Booking confirmation email sent",
        );
      }
    } catch (error) {
      this.logger.error(
        `Booking email failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async fireAndForget(
    label: string,
    promise: Promise<boolean>,
  ): Promise<void> {
    try {
      await promise;
    } catch (error) {
      this.logger.error(
        `${label} email failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private assertMutable(status: AppointmentStatus): void {
    if (
      status === "CANCELLED" ||
      status === "COMPLETED" ||
      status === "NO_SHOW"
    ) {
      throw new ConflictException("This appointment can no longer be changed");
    }
  }

  private toUtc(date: string, time: string, timezoneLabel: string): Date {
    const iana = TIMEZONE_IANA[timezoneLabel];
    const [hour, minute] = this.parseTime(time);
    const [year, month, day] = date.split("-").map((part) => Number(part));
    return fromZonedTime(
      new Date(year, month - 1, day, hour, minute, 0, 0),
      iana,
    );
  }

  private parseTime(time: string): [number, number] {
    const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
    if (!match) {
      throw new BadRequestException("Invalid time slot");
    }
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const period = match[3].toUpperCase();
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return [hour, minute];
  }

  private assertUuidToken(token: string): void {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        token,
      )
    ) {
      throw new NotFoundException("Appointment not found");
    }
  }

  private log(
    appointmentId: string,
    action: ActionType,
    previousTime: Date | null,
    newTime: Date | null,
    notes: string,
  ): Promise<unknown> {
    return this.prisma.appointmentLog.create({
      data: {
        appointmentId,
        action,
        previousTime,
        newTime,
        notes,
      },
    });
  }
}
