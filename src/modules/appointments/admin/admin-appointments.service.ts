// import {
//   BadRequestException,
//   ConflictException,
//   Injectable,
//   NotFoundException,
// } from "@nestjs/common";
// import type { Prisma } from "../../../generated/prisma/client";
// import type { AppointmentStatus } from "../../../generated/prisma/enums";
// import type { AppointmentModel } from "../../../generated/prisma/models";
// import type { AdminAuth } from "../../../common/interfaces/admin-auth.interface";
// import { PrismaService } from "../../../database/prisma.service";
// import {
//   AdminAppointmentQueryDto,
//   AdminStatusUpdateDto,
// } from "./dto/admin-appointment.dto";

// /** A log row as returned by the detail endpoint, flattened for the UI. */
// export type AdminHistoryEntry = {
//   id: string;
//   action: string;
//   previousTime: Date | null;
//   newTime: Date | null;
//   notes: string | null;
//   adminUserId: string | null;
//   adminUserName: string | null;
//   createdAt: Date;
// };

// /** The most recent provider-reported outcome for one outbound email. */
// export type AdminEmailDeliverySummary = {
//   id: string;
//   kind: string;
//   status: string;
//   statusReason: string | null;
//   statusAt: Date | null;
//   createdAt: Date;
// };

// export type AdminAppointmentDetail = Omit<AppointmentModel, "history"> & {
//   history: AdminHistoryEntry[];
//   emailDeliveries: AdminEmailDeliverySummary[];
// };

// /** A list row with the latest email outcome folded in, so the UI can show
//  *  delivery health without a second request per appointment. */
// export type AdminAppointmentRow = Omit<AppointmentModel, "emailDeliveries"> & {
//   emailDelivery: AdminEmailDeliverySummary | null;
// };

// @Injectable()
// export class AdminAppointmentsService {
//   constructor(private readonly prisma: PrismaService) {}

//   async list(query: AdminAppointmentQueryDto) {
//     const where = this.buildWhere(query);
//     const skip = query.skip ?? 0;
//     const take = query.take ?? 100;

//     const [rows, total] = await this.prisma.$transaction([
//       this.prisma.appointment.findMany({
//         where,
//         orderBy: [{ scheduledAtUtc: "asc" }],
//         skip,
//         take,
//       }),
//       this.prisma.appointment.count({ where }),
//     ]);

//     // Fold in the latest provider-reported outcome for each row so the list
//     // shows delivery health without per-appointment lookups.
//     const items: AdminAppointmentRow[] = rows.map((row) => ({
//       ...row,
//       emailDelivery: this.latestDelivery(row.emailDeliveries) ?? null,
//     }));

//     return { items, total, skip, take };
//   }

//   private latestDelivery(
//     deliveries: AppointmentModel["emailDeliveries"],
//   ): AdminEmailDeliverySummary | null {
//     if (!deliveries || deliveries.length === 0) return null;
//     const latest = deliveries.reduce((a, b) =>
//       (b.createdAt ?? new Date(0)) > (a.createdAt ?? new Date(0)) ? b : a,
//     );
//     return {
//       id: latest.id,
//       kind: latest.kind,
//       status: latest.status,
//       statusReason: latest.statusReason ?? null,
//       statusAt: latest.statusAt ?? null,
//       createdAt: latest.createdAt,
//     };
//   }

//   async detail(id: string): Promise<AdminAppointmentDetail> {
//     const appointment = await this.prisma.appointment.findUnique({
//       where: { id },
//       include: {
//         history: {
//           orderBy: { createdAt: "desc" },
//           include: {
//             // onDelete: SetNull means a deleted admin yields null, so this
//             // stays optional and the UI falls back to the raw ID.
//             adminUser: { select: { name: true } },
//           },
//         },
//         // Pull all deliveries for the appointment so we can surface the
//         // timeline (ACCEPTED → BOUNCED/DELIVERED/etc.) in the detail view.
//         emailDeliveries: {
//           orderBy: { createdAt: "desc" },
//         },
//       },
//     });
//     if (!appointment) {
//       throw new NotFoundException("Appointment not found");
//     }

//     const { history, emailDeliveries, ...rest } = appointment;

//     return {
//       ...rest,
//       history: history.map((entry) => ({
//         id: entry.id,
//         action: entry.action,
//         previousTime: entry.previousTime,
//         newTime: entry.newTime,
//         notes: entry.notes,
//         adminUserId: entry.adminUserId,
//         adminUserName: entry.adminUser?.name ?? null,
//         createdAt: entry.createdAt,
//       })),
//       emailDeliveries: emailDeliveries.map((d) => ({
//         id: d.id,
//         kind: d.kind,
//         status: d.status,
//         statusReason: d.statusReason ?? null,
//         statusAt: d.statusAt ?? null,
//         createdAt: d.createdAt,
//       })),
//     };
//   }

//   async changeStatus(
//     id: string,
//     dto: AdminStatusUpdateDto,
//     admin: AdminAuth,
//   ): Promise<AppointmentModel> {
//     const appointment = await this.prisma.appointment.findUnique({
//       where: { id },
//     });
//     if (!appointment) {
//       throw new NotFoundException("Appointment not found");
//     }
//     if (appointment.status === "CANCELLED") {
//       throw new ConflictException("Cancelled appointments cannot be changed");
//     }
//     if (appointment.status === dto.status) {
//       throw new BadRequestException("Appointment is already in this status");
//     }

//     const nextStatus = dto.status as AppointmentStatus;
//     const updated = await this.prisma.appointment.update({
//       where: { id: appointment.id },
//       data: {
//         status: nextStatus,
//         cancellationReason:
//           nextStatus === "CANCELLED" ? (dto.reason?.trim() ?? null) : null,
//       },
//     });

//     await this.prisma.appointmentLog.create({
//       data: {
//         appointmentId: appointment.id,
//         adminUserId: admin.id,
//         action:
//           nextStatus === "COMPLETED"
//             ? "MARKED_COMPLETED_BY_ADMIN"
//             : "CANCELLED_BY_ADMIN",
//         previousTime: appointment.scheduledAtUtc,
//         newTime: nextStatus === "CANCELLED" ? null : appointment.scheduledAtUtc,
//         notes: dto.reason?.trim() ?? "Status changed by admin",
//       },
//     });

//     return updated;
//   }

//   private buildWhere(
//     query: AdminAppointmentQueryDto,
//   ): Prisma.AppointmentWhereInput {
//     const where: Prisma.AppointmentWhereInput = {};

//     if (query.status === "upcoming") {
//       where.status = { in: ["CONFIRMED", "RESCHEDULED"] };
//       where.scheduledAtUtc = { gte: new Date() };
//     } else if (query.status === "completed") {
//       where.status = "COMPLETED";
//     } else if (query.status === "cancelled") {
//       where.status = "CANCELLED";
//     }

//     if (query.search) {
//       const term = query.search.trim();
//       where.OR = [
//         { contactName: { contains: term, mode: "insensitive" } },
//         { companyName: { contains: term, mode: "insensitive" } },
//         { email: { contains: term, mode: "insensitive" } },
//       ];
//     }

//     if (query.from || query.to) {
//       const range: Prisma.DateTimeFilter = {};
//       if (query.from) range.gte = new Date(`${query.from}T00:00:00.000Z`);
//       if (query.to) range.lt = new Date(`${query.to}T00:00:00.000Z`);
//       where.scheduledAtUtc = {
//         ...(where.scheduledAtUtc as Prisma.DateTimeFilter),
//         ...range,
//       };
//     }

//     return where;
//   }
// }
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "../../../generated/prisma/client";
import type { AppointmentStatus } from "../../../generated/prisma/enums";
import type { AppointmentModel } from "../../../generated/prisma/models";
import type { AdminAuth } from "../../../common/interfaces/admin-auth.interface";
import { PrismaService } from "../../../database/prisma.service";
import {
  AdminAppointmentQueryDto,
  AdminStatusUpdateDto,
} from "./dto/admin-appointment.dto";

/** A log row as returned by the detail endpoint, flattened for the UI. */
export type AdminHistoryEntry = {
  id: string;
  action: string;
  previousTime: Date | null;
  newTime: Date | null;
  notes: string | null;
  adminUserId: string | null;
  adminUserName: string | null;
  createdAt: Date;
};

/** The most recent provider-reported outcome for one outbound email. */
export type AdminEmailDeliverySummary = {
  id: string;
  kind: string;
  status: string;
  statusReason: string | null;
  statusAt: Date | null;
  createdAt: Date;
};

export type AdminAppointmentDetail = AppointmentModel & {
  history: AdminHistoryEntry[];
  emailDeliveries: AdminEmailDeliverySummary[];
};

/** A list row with the latest email outcome folded in, so the UI can show
 *  delivery health without a second request per appointment. */
export type AdminAppointmentRow = AppointmentModel & {
  emailDelivery: AdminEmailDeliverySummary | null;
};

@Injectable()
export class AdminAppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminAppointmentQueryDto) {
    const where = this.buildWhere(query);
    const skip = query.skip ?? 0;
    const take = query.take ?? 100;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        orderBy: [{ scheduledAtUtc: "asc" }],
        skip,
        take,
        include: {
          // Only the newest delivery per appointment; the DB picks "latest"
          // so we don't load every delivery row for every appointment.
          emailDeliveries: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    // Fold the latest provider-reported outcome into each row and drop the
    // raw relation so it doesn't leak into the API response.
    const items: AdminAppointmentRow[] = rows.map(
      ({ emailDeliveries, ...row }) => {
        const latest = emailDeliveries[0];
        return {
          ...row,
          emailDelivery: latest
            ? {
                id: latest.id,
                kind: latest.kind,
                status: latest.status,
                statusReason: latest.statusReason ?? null,
                statusAt: latest.statusAt ?? null,
                createdAt: latest.createdAt,
              }
            : null,
        };
      },
    );

    return { items, total, skip, take };
  }

  async detail(id: string): Promise<AdminAppointmentDetail> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        history: {
          orderBy: { createdAt: "desc" },
          include: {
            // onDelete: SetNull means a deleted admin yields null, so this
            // stays optional and the UI falls back to the raw ID.
            adminUser: { select: { name: true } },
          },
        },
        // Pull all deliveries for the appointment so we can surface the
        // timeline (ACCEPTED → BOUNCED/DELIVERED/etc.) in the detail view.
        emailDeliveries: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!appointment) {
      throw new NotFoundException("Appointment not found");
    }

    const { history, emailDeliveries, ...rest } = appointment;

    return {
      ...rest,
      history: history.map((entry) => ({
        id: entry.id,
        action: entry.action,
        previousTime: entry.previousTime,
        newTime: entry.newTime,
        notes: entry.notes,
        adminUserId: entry.adminUserId,
        adminUserName: entry.adminUser?.name ?? null,
        createdAt: entry.createdAt,
      })),
      emailDeliveries: emailDeliveries.map((d) => ({
        id: d.id,
        kind: d.kind,
        status: d.status,
        statusReason: d.statusReason ?? null,
        statusAt: d.statusAt ?? null,
        createdAt: d.createdAt,
      })),
    };
  }

  async changeStatus(
    id: string,
    dto: AdminStatusUpdateDto,
    admin: AdminAuth,
  ): Promise<AppointmentModel> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });
    if (!appointment) {
      throw new NotFoundException("Appointment not found");
    }
    if (appointment.status === "CANCELLED") {
      throw new ConflictException("Cancelled appointments cannot be changed");
    }
    if (appointment.status === dto.status) {
      throw new BadRequestException("Appointment is already in this status");
    }

    const nextStatus = dto.status as AppointmentStatus;
    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: nextStatus,
        cancellationReason:
          nextStatus === "CANCELLED" ? (dto.reason?.trim() ?? null) : null,
      },
    });

    await this.prisma.appointmentLog.create({
      data: {
        appointmentId: appointment.id,
        adminUserId: admin.id,
        action:
          nextStatus === "COMPLETED"
            ? "MARKED_COMPLETED_BY_ADMIN"
            : "CANCELLED_BY_ADMIN",
        previousTime: appointment.scheduledAtUtc,
        newTime: nextStatus === "CANCELLED" ? null : appointment.scheduledAtUtc,
        notes: dto.reason?.trim() ?? "Status changed by admin",
      },
    });

    return updated;
  }

  private buildWhere(
    query: AdminAppointmentQueryDto,
  ): Prisma.AppointmentWhereInput {
    const where: Prisma.AppointmentWhereInput = {};

    if (query.status === "upcoming") {
      where.status = { in: ["CONFIRMED", "RESCHEDULED"] };
      where.scheduledAtUtc = { gte: new Date() };
    } else if (query.status === "completed") {
      where.status = "COMPLETED";
    } else if (query.status === "cancelled") {
      where.status = "CANCELLED";
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { contactName: { contains: term, mode: "insensitive" } },
        { companyName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ];
    }

    if (query.from || query.to) {
      const range: Prisma.DateTimeFilter = {};
      if (query.from) range.gte = new Date(`${query.from}T00:00:00.000Z`);
      if (query.to) range.lt = new Date(`${query.to}T00:00:00.000Z`);
      where.scheduledAtUtc = {
        ...(where.scheduledAtUtc as Prisma.DateTimeFilter),
        ...range,
      };
    }

    return where;
  }
}
