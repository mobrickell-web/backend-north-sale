import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import {
  LeadActivityType,
  LeadStatus,
  Role,
} from "../../generated/prisma/enums";
import type { AdminAuth } from "../../common/interfaces/admin-auth.interface";
import { PrismaService } from "../../database/prisma.service";
import {
  ANNUAL_GROSS_REVENUE_KIND_LABELS,
  EXISTING_SALES_FORCE_LABELS,
  LEAD_STATUS_LABELS,
  type AssignLeadDto,
  type CheckLeadDuplicatesQueryDto,
  type CompleteLeadAppointmentDto,
  type CreateLeadActivityDto,
  type CreateLeadCallDto,
  type CreateLeadContactDto,
  type CreateLeadDto,
  type CreateLeadFollowUpDto,
  type ListLeadsQueryDto,
  type UpdateLeadContactDto,
  type UpdateLeadDto,
} from "./dto/lead.dto";

type DuplicateMatchField = "company" | "website" | "phone";

type DuplicateLeadHit = {
  id: string;
  companyName: string;
  website: string | null;
  phone: string | null;
  status: LeadStatus;
  owner: { id: string; name: string; email: string } | null;
  matchedOn: DuplicateMatchField[];
};

/** Closed outcomes — excluded from Active Leads and follow-up due lists. */
const INACTIVE_LEAD_STATUSES: LeadStatus[] = [
  LeadStatus.APPOINTMENT_COMPLETED,
  LeadStatus.CLIENT_ACQUIRED,
  LeadStatus.NOT_INTERESTED,
  LeadStatus.NOT_QUALIFIED,
  LeadStatus.DO_NOT_CONTACT,
];

/** Early pipeline — scheduling a follow-up promotes Current Status to Callback Required. */
const FOLLOW_UP_PROMOTE_STATUSES: LeadStatus[] = [
  LeadStatus.NEW_PROSPECT,
  LeadStatus.NO_ANSWER,
  LeadStatus.GATEKEEPER_REACHED,
  LeadStatus.DECISION_MAKER_REACHED,
  LeadStatus.CALLBACK_REQUIRED,
];

const CONTACT_SELECT = {
  id: true,
  leadId: true,
  name: true,
  title: true,
  phone: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} as const;

const ACTIVITY_SELECT = {
  id: true,
  leadId: true,
  authorId: true,
  authorName: true,
  type: true,
  body: true,
  disposition: true,
  nextFollowUpAt: true,
  contactId: true,
  createdAt: true,
} as const;

/** Call logs include nested contact for A10 UI. */
const CALL_SELECT = {
  ...ACTIVITY_SELECT,
  contact: { select: CONTACT_SELECT },
} as const;

const FOLLOW_UP_SELECT = {
  id: true,
  leadId: true,
  createdById: true,
  createdByName: true,
  dueAt: true,
  notes: true,
  completedAt: true,
  completedById: true,
  completedByName: true,
  createdAt: true,
  updatedAt: true,
} as const;

const OWNER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  position: true,
} as const;

const LEAD_SELECT = {
  id: true,
  ownerId: true,
  companyName: true,
  website: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  gatekeeperName: true,
  gatekeeperPhone: true,
  decisionMakerName: true,
  decisionMakerEmail: true,
  decisionMakerPhone: true,
  annualRevenue: true,
  annualGrossRevenueKind: true,
  existingSalesForce: true,
  numberOfSalesRepresentatives: true,
  salesForceSize: true,
  leadSource: true,
  status: true,
  notQualifiedReason: true,
  followUpAt: true,
  followUpNotes: true,
  appointmentAt: true,
  appointmentNotes: true,
  appointmentCompletedAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: OWNER_SELECT },
  /** A11 list — first contact by name for Contact Person column. */
  contacts: {
    take: 1,
    orderBy: { name: "asc" as const },
    select: {
      id: true,
      name: true,
      title: true,
      phone: true,
      email: true,
    },
  },
  /** A11 list — latest call for Last Contact column. */
  activities: {
    where: { type: LeadActivityType.CALL },
    take: 1,
    orderBy: { createdAt: "desc" as const },
    select: { createdAt: true },
  },
} as const;

type LeadSelectRow = Prisma.LeadGetPayload<{ select: typeof LEAD_SELECT }>;

/** Flatten list helpers so FE gets primaryContact + lastContactAt. */
function serializeLead(row: LeadSelectRow) {
  const { contacts, activities, ...lead } = row;
  return {
    ...lead,
    primaryContact: contacts[0] ?? null,
    lastContactAt: activities[0]?.createdAt ?? null,
  };
}

/**
 * Trims an optional field. `undefined` leaves it unchanged; an empty or
 * whitespace-only string (or null) clears it.
 */
function optionalText(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

function optionalDate(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("Invalid date value");
  }
  return date;
}

/** `undefined` leaves unchanged; `""` / null clears; otherwise returns the enum. */
function optionalEnum<T extends string>(
  value: T | "" | null | undefined,
): T | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return value;
}

/** `undefined` leaves unchanged; `null` clears; otherwise returns the int. */
function optionalInt(
  value: number | null | undefined,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Number.isInteger(value) || value < 0) {
    throw new BadRequestException(
      "numberOfSalesRepresentatives must be a non-negative integer",
    );
  }
  return value;
}

/**
 * A12 — Prefer numberOfSalesRepresentatives; keep salesForceSize in sync when
 * the int is set so legacy CSV / older clients still see a size string.
 */
function resolveSalesForceFields(input: {
  numberOfSalesRepresentatives?: number | null;
  salesForceSize?: string | null | undefined;
}): {
  numberOfSalesRepresentatives?: number | null;
  salesForceSize?: string | null;
} {
  const reps = optionalInt(input.numberOfSalesRepresentatives);
  const sizeFromDto = optionalText(input.salesForceSize);

  if (reps !== undefined) {
    return {
      numberOfSalesRepresentatives: reps,
      salesForceSize:
        reps === null
          ? sizeFromDto === undefined
            ? null
            : sizeFromDto
          : sizeFromDto === undefined
            ? String(reps)
            : sizeFromDto,
    };
  }

  return {
    salesForceSize: sizeFromDto,
  };
}

function normalizeCompany(value?: string | null): string | null {
  const trimmed = value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
  return trimmed === "" ? null : trimmed;
}

function normalizeWebsite(value?: string | null): string | null {
  let website = value?.trim().toLowerCase() ?? "";
  if (!website) return null;
  website = website.replace(/^https?:\/\//, "").replace(/^www\./, "");
  website = website.replace(/\/+$/, "");
  return website === "" ? null : website;
}

function normalizePhone(value?: string | null): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function csvEscape(value: string | null | undefined): string {
  const text = value ?? "";
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function csvDate(value: Date | null | undefined): string {
  return value ? value.toISOString() : "";
}

function assertStatusRules(input: {
  status: LeadStatus;
  notQualifiedReason?: string | null;
  followUpAt?: Date | null;
  followUpNotes?: string | null;
  appointmentAt?: Date | null;
}) {
  if (input.status === LeadStatus.NOT_QUALIFIED) {
    if (!input.notQualifiedReason?.trim()) {
      throw new BadRequestException(
        "Not Qualified requires a notQualifiedReason",
      );
    }
  }
  if (input.status === LeadStatus.CALLBACK_REQUIRED) {
    if (!input.followUpAt) {
      throw new BadRequestException(
        "Callback Required requires followUpAt (date/time)",
      );
    }
  }
  if (input.status === LeadStatus.ZOOM_SCHEDULED) {
    if (!input.appointmentAt) {
      throw new BadRequestException(
        "Zoom Scheduled requires appointmentAt (date/time)",
      );
    }
  }
  if (input.status === LeadStatus.APPOINTMENT_COMPLETED) {
    if (!input.appointmentAt) {
      throw new BadRequestException(
        "Appointment Completed requires appointmentAt (schedule first, then mark completed)",
      );
    }
  }
}

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  private isAdmin(actor: AdminAuth) {
    return actor.role === Role.SUPER_ADMIN;
  }

  private async assertAssignableOwner(ownerId: string): Promise<{
    id: string;
    name: string;
  }> {
    const owner = await this.prisma.adminUser.findFirst({
      where: {
        id: ownerId,
        role: Role.SALES_REPRESENTATIVE,
        isActive: true,
      },
      select: { id: true, name: true },
    });
    if (!owner) {
      throw new BadRequestException(
        "ownerId must be an active Sales Representative",
      );
    }
    return owner;
  }

  private async writeReassignmentActivity(input: {
    leadId: string;
    actor: AdminAuth;
    fromName: string | null;
    toName: string;
  }) {
    const body = input.fromName
      ? `Lead reassigned from ${input.fromName} to ${input.toName}.`
      : `Lead assigned to ${input.toName}.`;
    await this.prisma.leadActivity.create({
      data: {
        leadId: input.leadId,
        authorId: input.actor.id,
        authorName: input.actor.name,
        type: LeadActivityType.REASSIGNED,
        body,
      },
    });
  }

  /** Master Admin: all reps. Reps: empty (assignment is Admin-only). */
  listAssignableOwners(actor: AdminAuth) {
    if (!this.isAdmin(actor)) {
      return [];
    }
    return this.prisma.adminUser.findMany({
      where: { role: Role.SALES_REPRESENTATIVE, isActive: true },
      select: OWNER_SELECT,
      orderBy: { name: "asc" },
    });
  }

  async list(actor: AdminAuth, query: ListLeadsQueryDto = {}) {
    const where: Prisma.LeadWhereInput = {};
    const { start, end, now } = this.utcDayBounds();

    if (this.isAdmin(actor)) {
      if (query.ownerId) where.ownerId = query.ownerId;
    } else {
      where.ownerId = actor.id;
      if (query.ownerId && query.ownerId !== actor.id) {
        throw new ForbiddenException("You can only list your own leads");
      }
    }

    // Dashboard totals click-through (same rules as GET /leads/totals).
    switch (query.filter) {
      case "active":
        where.status = { notIn: INACTIVE_LEAD_STATUSES };
        break;
      case "follow_ups_due_today":
        where.status = { notIn: INACTIVE_LEAD_STATUSES };
        where.followUps = {
          some: {
            completedAt: null,
            dueAt: { gte: start, lt: end },
          },
        };
        break;
      case "follow_ups_overdue":
        where.status = { notIn: INACTIVE_LEAD_STATUSES };
        where.followUps = {
          some: {
            completedAt: null,
            dueAt: { lt: start },
          },
        };
        break;
      case "upcoming_appointments":
        where.status = LeadStatus.ZOOM_SCHEDULED;
        where.appointmentAt = { gte: now };
        break;
      default:
        break;
    }

    // Explicit status narrows further (and overrides filter status when both set).
    if (query.status) {
      where.status = query.status;
    }

    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { companyName: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { decisionMakerName: { contains: q, mode: "insensitive" } },
        { gatekeeperName: { contains: q, mode: "insensitive" } },
        { website: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      ];
    }

    const orderBy: Prisma.LeadOrderByWithRelationInput[] =
      query.filter === "upcoming_appointments"
        ? [{ appointmentAt: "asc" }, { updatedAt: "desc" }]
        : query.filter === "follow_ups_due_today" ||
            query.filter === "follow_ups_overdue"
          ? [{ followUpAt: "asc" }, { updatedAt: "desc" }]
          : [{ updatedAt: "desc" }];

    const rows = await this.prisma.lead.findMany({
      where,
      select: LEAD_SELECT,
      orderBy,
    });
    return rows.map(serializeLead);
  }

  /** A5 — CSV export with the same scope/filters as GET /leads. */
  async exportCsv(actor: AdminAuth, query: ListLeadsQueryDto = {}) {
    const leads = await this.list(actor, query);
    const header = [
      "companyName",
      "contactName",
      "email",
      "phone",
      "status",
      "website",
      "address",
      "gatekeeperName",
      "gatekeeperPhone",
      "decisionMakerName",
      "decisionMakerEmail",
      "decisionMakerPhone",
      "annualRevenue",
      "annualGrossRevenueKind",
      "existingSalesForce",
      "numberOfSalesRepresentatives",
      "salesForceSize",
      "leadSource",
      "ownerName",
      "ownerEmail",
      "followUpAt",
      "appointmentAt",
      "appointmentCompletedAt",
      "notes",
      "createdAt",
      "updatedAt",
    ];
    const rows = leads.map((lead) =>
      [
        csvEscape(lead.companyName),
        csvEscape(lead.primaryContact?.name ?? lead.name),
        csvEscape(lead.primaryContact?.email ?? lead.email),
        csvEscape(lead.primaryContact?.phone ?? lead.phone),
        csvEscape(lead.status),
        csvEscape(lead.website),
        csvEscape(lead.address),
        csvEscape(lead.gatekeeperName),
        csvEscape(lead.gatekeeperPhone),
        csvEscape(lead.decisionMakerName),
        csvEscape(lead.decisionMakerEmail),
        csvEscape(lead.decisionMakerPhone),
        csvEscape(lead.annualRevenue),
        csvEscape(
          lead.annualGrossRevenueKind
            ? ANNUAL_GROSS_REVENUE_KIND_LABELS[lead.annualGrossRevenueKind]
            : "",
        ),
        csvEscape(
          lead.existingSalesForce
            ? EXISTING_SALES_FORCE_LABELS[lead.existingSalesForce]
            : "",
        ),
        csvEscape(
          lead.numberOfSalesRepresentatives != null
            ? String(lead.numberOfSalesRepresentatives)
            : "",
        ),
        csvEscape(lead.salesForceSize),
        csvEscape(lead.leadSource),
        csvEscape(lead.owner?.name ?? "Unassigned"),
        csvEscape(lead.owner?.email ?? ""),
        csvEscape(csvDate(lead.followUpAt)),
        csvEscape(csvDate(lead.appointmentAt)),
        csvEscape(csvDate(lead.appointmentCompletedAt)),
        csvEscape(lead.notes),
        csvEscape(csvDate(lead.createdAt)),
        csvEscape(csvDate(lead.updatedAt)),
      ].join(","),
    );
    const csv = `\uFEFF${header.join(",")}\n${rows.join("\n")}\n`;
    const day = new Date().toISOString().slice(0, 10);
    const scope = this.isAdmin(actor) ? "all" : "mine";
    return {
      filename: `leads-${scope}-${day}.csv`,
      csv,
    };
  }

  async getById(actor: AdminAuth, id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      select: LEAD_SELECT,
    });
    if (!lead) throw new NotFoundException("Lead not found");
    if (!this.isAdmin(actor) && lead.ownerId !== actor.id) {
      throw new NotFoundException("Lead not found");
    }
    return serializeLead(lead);
  }

  /**
   * A5 — likely duplicates by company name, website, or phone (org-wide).
   * Used by soft preview + create/update conflict warnings.
   */
  async findDuplicateLeads(input: {
    companyName?: string | null;
    website?: string | null;
    phone?: string | null;
    excludeId?: string;
  }): Promise<DuplicateLeadHit[]> {
    const company = normalizeCompany(input.companyName);
    const website = normalizeWebsite(input.website);
    const phone = normalizePhone(input.phone);
    if (!company && !website && !phone) return [];

    const or: Prisma.LeadWhereInput[] = [];
    if (company) {
      or.push({
        companyName: { equals: input.companyName!.trim(), mode: "insensitive" },
      });
    }
    if (website) {
      const host = website.split("/")[0] ?? website;
      or.push({ website: { contains: host, mode: "insensitive" } });
    }
    if (phone) {
      const needle = phone.length >= 7 ? phone.slice(-7) : phone;
      or.push(
        { phone: { contains: needle } },
        { gatekeeperPhone: { contains: needle } },
        { decisionMakerPhone: { contains: needle } },
      );
    }

    const candidates = await this.prisma.lead.findMany({
      where: {
        OR: or,
        ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      },
      select: {
        id: true,
        companyName: true,
        website: true,
        phone: true,
        gatekeeperPhone: true,
        decisionMakerPhone: true,
        status: true,
        owner: { select: { id: true, name: true, email: true } },
      },
      take: 50,
      orderBy: { updatedAt: "desc" },
    });

    const hits: DuplicateLeadHit[] = [];
    for (const row of candidates) {
      const matchedOn: DuplicateMatchField[] = [];
      if (company && normalizeCompany(row.companyName) === company) {
        matchedOn.push("company");
      }
      const rowWebsite = normalizeWebsite(row.website);
      if (
        website &&
        rowWebsite &&
        (rowWebsite === website ||
          rowWebsite.endsWith(website) ||
          website.endsWith(rowWebsite))
      ) {
        matchedOn.push("website");
      }
      if (phone) {
        const phones = [
          normalizePhone(row.phone),
          normalizePhone(row.gatekeeperPhone),
          normalizePhone(row.decisionMakerPhone),
        ].filter(Boolean);
        if (
          phones.some(
            (candidate) =>
              candidate === phone ||
              candidate!.endsWith(phone) ||
              phone.endsWith(candidate!),
          )
        ) {
          matchedOn.push("phone");
        }
      }
      if (matchedOn.length === 0) continue;
      hits.push({
        id: row.id,
        companyName: row.companyName,
        website: row.website,
        phone: row.phone,
        status: row.status,
        owner: row.owner,
        matchedOn,
      });
      if (hits.length >= 10) break;
    }
    return hits;
  }

  checkDuplicates(query: CheckLeadDuplicatesQueryDto) {
    return this.findDuplicateLeads({
      companyName: query.companyName,
      website: query.website,
      phone: query.phone,
      excludeId: query.excludeId,
    }).then((duplicates) => ({ duplicates }));
  }

  private async assertNoDuplicateConflict(input: {
    companyName?: string | null;
    website?: string | null;
    phone?: string | null;
    excludeId?: string;
    acknowledgeDuplicates?: boolean;
  }) {
    if (input.acknowledgeDuplicates) return;
    const duplicates = await this.findDuplicateLeads(input);
    if (duplicates.length === 0) return;
    throw new ConflictException({
      statusCode: 409,
      error: "Conflict",
      code: "LEAD_DUPLICATES",
      message:
        "Possible duplicate leads found. Review matches and resubmit with acknowledgeDuplicates=true to proceed.",
      duplicates,
    });
  }

  async create(actor: AdminAuth, dto: CreateLeadDto) {
    const companyName = dto.companyName.trim();
    if (!companyName) {
      throw new BadRequestException("Company name is required");
    }

    // A11 — EADS always self-owned; Admin may omit ownerId (unassigned) or assign.
    let ownerId: string | null;
    let assignedOwnerName: string | null;
    if (this.isAdmin(actor)) {
      if (dto.ownerId) {
        const owner = await this.assertAssignableOwner(dto.ownerId);
        ownerId = owner.id;
        assignedOwnerName = owner.name;
      } else {
        ownerId = null;
        assignedOwnerName = null;
      }
    } else if (dto.ownerId && dto.ownerId !== actor.id) {
      throw new ForbiddenException("You can only create leads assigned to you");
    } else {
      ownerId = actor.id;
      assignedOwnerName = actor.name;
    }

    await this.assertNoDuplicateConflict({
      companyName,
      website: dto.website,
      phone: dto.phone,
      acknowledgeDuplicates: dto.acknowledgeDuplicates,
    });

    const status = dto.status ?? LeadStatus.NEW_PROSPECT;
    const notQualifiedReason = optionalText(dto.notQualifiedReason) ?? null;
    const followUpAt = optionalDate(dto.followUpAt) ?? null;
    const followUpNotes = optionalText(dto.followUpNotes) ?? null;
    const appointmentAt = optionalDate(dto.appointmentAt) ?? null;

    assertStatusRules({
      status,
      notQualifiedReason,
      followUpAt,
      followUpNotes,
      appointmentAt,
    });

    const salesForce = resolveSalesForceFields({
      numberOfSalesRepresentatives: dto.numberOfSalesRepresentatives,
      salesForceSize: dto.salesForceSize,
    });

    const lead = await this.prisma.lead.create({
      data: {
        ownerId,
        companyName,
        website: optionalText(dto.website) ?? null,
        name: optionalText(dto.name) ?? null,
        email: optionalText(dto.email) ?? null,
        phone: optionalText(dto.phone) ?? null,
        address: optionalText(dto.address) ?? null,
        gatekeeperName: optionalText(dto.gatekeeperName) ?? null,
        gatekeeperPhone: optionalText(dto.gatekeeperPhone) ?? null,
        decisionMakerName: optionalText(dto.decisionMakerName) ?? null,
        decisionMakerEmail: optionalText(dto.decisionMakerEmail) ?? null,
        decisionMakerPhone: optionalText(dto.decisionMakerPhone) ?? null,
        annualRevenue: optionalText(dto.annualRevenue) ?? null,
        annualGrossRevenueKind:
          optionalEnum(dto.annualGrossRevenueKind) ?? null,
        existingSalesForce: optionalEnum(dto.existingSalesForce) ?? null,
        numberOfSalesRepresentatives:
          salesForce.numberOfSalesRepresentatives ?? null,
        salesForceSize: salesForce.salesForceSize ?? null,
        leadSource: optionalText(dto.leadSource) ?? null,
        status,
        notQualifiedReason,
        followUpAt,
        followUpNotes,
        appointmentAt,
        appointmentNotes: optionalText(dto.appointmentNotes) ?? null,
        notes: optionalText(dto.notes) ?? null,
      },
      select: LEAD_SELECT,
    });

    if (this.isAdmin(actor) && assignedOwnerName) {
      await this.writeReassignmentActivity({
        leadId: lead.id,
        actor,
        fromName: null,
        toName: assignedOwnerName,
      });
    }

    return serializeLead(lead);
  }

  /**
   * Master Admin only — assign / reassign a lead to an active Sales Representative.
   * A11: works for unassigned → specialist and specialist → specialist.
   * Only updates ownerId — activities / contacts / follow-ups are preserved.
   */
  async assign(actor: AdminAuth, leadId: string, dto: AssignLeadDto) {
    if (!this.isAdmin(actor)) {
      throw new ForbiddenException("Only Master Admin can assign leads");
    }

    const existing = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        ownerId: true,
        owner: { select: { id: true, name: true } },
      },
    });
    if (!existing) throw new NotFoundException("Lead not found");

    const nextOwner = await this.assertAssignableOwner(dto.ownerId);
    if (existing.ownerId === nextOwner.id) {
      throw new BadRequestException(
        "Lead is already assigned to this Sales Representative",
      );
    }

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { ownerId: nextOwner.id },
    });

    await this.writeReassignmentActivity({
      leadId,
      actor,
      fromName: existing.owner?.name ?? null,
      toName: nextOwner.name,
    });

    return this.getById(actor, leadId);
  }

  async update(actor: AdminAuth, id: string, dto: UpdateLeadDto) {
    const existing = await this.prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        companyName: true,
        website: true,
        phone: true,
        status: true,
        notQualifiedReason: true,
        followUpAt: true,
        followUpNotes: true,
        appointmentAt: true,
        appointmentCompletedAt: true,
      },
    });
    if (!existing) throw new NotFoundException("Lead not found");
    if (!this.isAdmin(actor) && existing.ownerId !== actor.id) {
      throw new NotFoundException("Lead not found");
    }

    let nextOwnerId: string | null | undefined;
    let nextOwnerName: string | null | undefined;
    let previousOwnerName: string | null | undefined;
    let ownerChanged = false;
    if (dto.ownerId !== undefined) {
      if (!this.isAdmin(actor)) {
        throw new ForbiddenException("Only Master Admin can reassign leads");
      }
      // Empty string clears to unassigned (A11).
      if (dto.ownerId === "") {
        nextOwnerId = null;
        nextOwnerName = null;
        ownerChanged = existing.ownerId !== null;
        if (ownerChanged && existing.ownerId) {
          const previous = await this.prisma.adminUser.findUnique({
            where: { id: existing.ownerId },
            select: { name: true },
          });
          previousOwnerName = previous?.name ?? "Unknown";
        }
      } else {
        const nextOwner = await this.assertAssignableOwner(dto.ownerId);
        nextOwnerId = nextOwner.id;
        nextOwnerName = nextOwner.name;
        ownerChanged = nextOwnerId !== existing.ownerId;
        if (ownerChanged) {
          if (existing.ownerId) {
            const previous = await this.prisma.adminUser.findUnique({
              where: { id: existing.ownerId },
              select: { name: true },
            });
            previousOwnerName = previous?.name ?? "Unknown";
          } else {
            previousOwnerName = null;
          }
        }
      }
    }

    const companyName =
      dto.companyName !== undefined ? dto.companyName.trim() : undefined;
    if (dto.companyName !== undefined && !companyName) {
      throw new BadRequestException("Company name is required");
    }

    const nextCompanyName = companyName ?? existing.companyName;
    const nextWebsite =
      dto.website !== undefined
        ? (optionalText(dto.website) ?? null)
        : existing.website;
    const nextPhone =
      dto.phone !== undefined
        ? (optionalText(dto.phone) ?? null)
        : existing.phone;

    if (
      dto.companyName !== undefined ||
      dto.website !== undefined ||
      dto.phone !== undefined
    ) {
      await this.assertNoDuplicateConflict({
        companyName: nextCompanyName,
        website: nextWebsite,
        phone: nextPhone,
        excludeId: id,
        acknowledgeDuplicates: dto.acknowledgeDuplicates,
      });
    }

    const status = dto.status ?? existing.status;
    const notQualifiedReason =
      dto.notQualifiedReason !== undefined
        ? (optionalText(dto.notQualifiedReason) ?? null)
        : existing.notQualifiedReason;
    const followUpAt =
      dto.followUpAt !== undefined
        ? (optionalDate(dto.followUpAt) ?? null)
        : existing.followUpAt;
    const followUpNotes =
      dto.followUpNotes !== undefined
        ? (optionalText(dto.followUpNotes) ?? null)
        : existing.followUpNotes;
    const appointmentAt =
      dto.appointmentAt !== undefined
        ? (optionalDate(dto.appointmentAt) ?? null)
        : existing.appointmentAt;

    assertStatusRules({
      status,
      notQualifiedReason,
      followUpAt,
      followUpNotes,
      appointmentAt,
    });

    /** A13 — keep schedule history; stamp/clear completion timestamp with status. */
    let appointmentCompletedAt: Date | null | undefined = undefined;
    if (dto.appointmentAt !== undefined && appointmentAt === null) {
      appointmentCompletedAt = null;
    } else if (status === LeadStatus.ZOOM_SCHEDULED) {
      appointmentCompletedAt = null;
    } else if (status === LeadStatus.APPOINTMENT_COMPLETED) {
      appointmentCompletedAt = existing.appointmentCompletedAt ?? new Date();
    } else if (
      dto.status !== undefined &&
      existing.status === LeadStatus.APPOINTMENT_COMPLETED
    ) {
      appointmentCompletedAt = null;
    }

    const salesForce = resolveSalesForceFields({
      numberOfSalesRepresentatives: dto.numberOfSalesRepresentatives,
      salesForceSize: dto.salesForceSize,
    });

    await this.prisma.lead.update({
      where: { id },
      data: {
        ownerId: nextOwnerId,
        companyName,
        website: optionalText(dto.website),
        name: optionalText(dto.name),
        email: optionalText(dto.email),
        phone: optionalText(dto.phone),
        address: optionalText(dto.address),
        gatekeeperName: optionalText(dto.gatekeeperName),
        gatekeeperPhone: optionalText(dto.gatekeeperPhone),
        decisionMakerName: optionalText(dto.decisionMakerName),
        decisionMakerEmail: optionalText(dto.decisionMakerEmail),
        decisionMakerPhone: optionalText(dto.decisionMakerPhone),
        annualRevenue: optionalText(dto.annualRevenue),
        annualGrossRevenueKind: optionalEnum(dto.annualGrossRevenueKind),
        existingSalesForce: optionalEnum(dto.existingSalesForce),
        numberOfSalesRepresentatives: salesForce.numberOfSalesRepresentatives,
        salesForceSize: salesForce.salesForceSize,
        leadSource: optionalText(dto.leadSource),
        status: dto.status,
        notQualifiedReason:
          dto.notQualifiedReason !== undefined ? notQualifiedReason : undefined,
        followUpAt: dto.followUpAt !== undefined ? followUpAt : undefined,
        followUpNotes:
          dto.followUpNotes !== undefined ? followUpNotes : undefined,
        appointmentAt:
          dto.appointmentAt !== undefined ? appointmentAt : undefined,
        appointmentNotes: optionalText(dto.appointmentNotes),
        appointmentCompletedAt,
        notes: optionalText(dto.notes),
      },
    });

    if (ownerChanged && nextOwnerId !== undefined) {
      if (nextOwnerId && nextOwnerName) {
        await this.writeReassignmentActivity({
          leadId: id,
          actor,
          fromName: previousOwnerName ?? null,
          toName: nextOwnerName,
        });
      } else if (nextOwnerId === null && previousOwnerName) {
        await this.writeReassignmentActivity({
          leadId: id,
          actor,
          fromName: previousOwnerName,
          toName: "Unassigned",
        });
      }
    }

    return this.getById(actor, id);
  }

  async remove(actor: AdminAuth, id: string): Promise<{ deleted: true }> {
    const existing = await this.prisma.lead.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    });
    if (!existing) throw new NotFoundException("Lead not found");
    if (!this.isAdmin(actor) && existing.ownerId !== actor.id) {
      throw new NotFoundException("Lead not found");
    }
    await this.prisma.lead.delete({ where: { id } });
    return { deleted: true };
  }

  // ---------------------------------------------------------------------------
  // A2 — Activities, follow-ups, CRM totals (manual CRM only; no website bookings)
  // ---------------------------------------------------------------------------

  private ownerScope(actor: AdminAuth): Prisma.LeadWhereInput {
    return this.isAdmin(actor) ? {} : { ownerId: actor.id };
  }

  private async requireScopedLead(actor: AdminAuth, leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, ownerId: true, status: true },
    });
    if (!lead) throw new NotFoundException("Lead not found");
    if (!this.isAdmin(actor) && lead.ownerId !== actor.id) {
      throw new NotFoundException("Lead not found");
    }
    return lead;
  }

  /** UTC calendar-day bounds for "due today" / overdue. */
  private utcDayBounds(now = new Date()) {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end, now };
  }

  async listActivities(actor: AdminAuth, leadId: string) {
    await this.requireScopedLead(actor, leadId);
    return this.prisma.leadActivity.findMany({
      where: { leadId },
      select: ACTIVITY_SELECT,
      orderBy: { createdAt: "desc" },
    });
  }

  async addActivity(
    actor: AdminAuth,
    leadId: string,
    dto: CreateLeadActivityDto,
  ) {
    await this.requireScopedLead(actor, leadId);
    const body = dto.body.trim();
    if (!body) throw new BadRequestException("Activity body is required");

    return this.prisma.leadActivity.create({
      data: {
        leadId,
        authorId: actor.id,
        authorName: actor.name,
        type: dto.type,
        body,
      },
      select: ACTIVITY_SELECT,
    });
  }

  /**
   * A9 — Company-level call history (disposition rows only; newest first).
   * Past dispositions are never overwritten when Current Status changes.
   */
  async listCalls(actor: AdminAuth, leadId: string) {
    await this.requireScopedLead(actor, leadId);
    return this.prisma.leadActivity.findMany({
      where: {
        leadId,
        type: LeadActivityType.CALL,
        disposition: { not: null },
      },
      select: CALL_SELECT,
      orderBy: { createdAt: "desc" },
    });
  }

  private async requireLeadContact(leadId: string, contactId: string) {
    const contact = await this.prisma.leadContact.findFirst({
      where: { id: contactId, leadId },
      select: CONTACT_SELECT,
    });
    if (!contact) {
      throw new BadRequestException(
        "contactId must belong to a contact on this lead",
      );
    }
    return contact;
  }

  /**
   * A9 — Log a call with permanent disposition (+ optional next follow-up).
   * Optionally updates lead Current Status; the call row stays append-only.
   */
  async logCall(actor: AdminAuth, leadId: string, dto: CreateLeadCallDto) {
    await this.requireScopedLead(actor, leadId);
    const notes = dto.notes.trim();
    if (!notes) throw new BadRequestException("Call notes are required");

    const contactId = dto.contactId?.trim() || null;
    const contact = contactId
      ? await this.requireLeadContact(leadId, contactId)
      : null;

    const nextFollowUpAt = optionalDate(dto.followUpAt) ?? null;
    const updateCurrentStatus = dto.updateCurrentStatus === true;
    const dispositionLabel = LEAD_STATUS_LABELS[dto.disposition];
    const contactPrefix = contact ? `Spoke with ${contact.name}. ` : "";
    const body = nextFollowUpAt
      ? `${contactPrefix}${dispositionLabel}. ${notes} Next follow-up: ${nextFollowUpAt.toISOString()}.`
      : `${contactPrefix}${dispositionLabel}. ${notes}`;

    if (updateCurrentStatus) {
      if (dto.disposition === LeadStatus.ZOOM_SCHEDULED) {
        throw new BadRequestException(
          "Zoom Scheduled as Current Status requires appointmentAt; log the call without updateCurrentStatus, or set Zoom via the appointment form",
        );
      }
      if (dto.disposition === LeadStatus.APPOINTMENT_COMPLETED) {
        throw new BadRequestException(
          "Appointment Completed requires POST /leads/:id/appointment/complete; log the call without updateCurrentStatus",
        );
      }
      assertStatusRules({
        status: dto.disposition,
        notQualifiedReason:
          dto.disposition === LeadStatus.NOT_QUALIFIED ? notes : undefined,
        followUpAt:
          dto.disposition === LeadStatus.CALLBACK_REQUIRED
            ? nextFollowUpAt
            : undefined,
        appointmentAt: undefined,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const call = await tx.leadActivity.create({
        data: {
          leadId,
          authorId: actor.id,
          authorName: actor.name,
          type: LeadActivityType.CALL,
          body,
          disposition: dto.disposition,
          nextFollowUpAt,
          contactId,
        },
        select: CALL_SELECT,
      });

      if (nextFollowUpAt) {
        await tx.leadFollowUp.create({
          data: {
            leadId,
            createdById: actor.id,
            createdByName: actor.name,
            dueAt: nextFollowUpAt,
            notes,
          },
        });
        await tx.leadActivity.create({
          data: {
            leadId,
            authorId: actor.id,
            authorName: actor.name,
            type: LeadActivityType.FOLLOW_UP_SCHEDULED,
            body: `Follow-up scheduled for ${nextFollowUpAt.toISOString()}. ${notes}`,
          },
        });
      }

      const leadUpdate: Prisma.LeadUpdateInput = {};
      if (updateCurrentStatus) {
        leadUpdate.status = dto.disposition;
        if (dto.disposition === LeadStatus.NOT_QUALIFIED) {
          leadUpdate.notQualifiedReason = notes;
        }
      }
      if (nextFollowUpAt) {
        leadUpdate.followUpAt = nextFollowUpAt;
        leadUpdate.followUpNotes = notes;
      }
      if (Object.keys(leadUpdate).length > 0) {
        await tx.lead.update({ where: { id: leadId }, data: leadUpdate });
      }

      return call;
    });
  }

  // ---------------------------------------------------------------------------
  // A10 — Contacts under a company
  // ---------------------------------------------------------------------------

  async listContacts(actor: AdminAuth, leadId: string) {
    await this.requireScopedLead(actor, leadId);
    return this.prisma.leadContact.findMany({
      where: { leadId },
      select: CONTACT_SELECT,
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    });
  }

  async createContact(
    actor: AdminAuth,
    leadId: string,
    dto: CreateLeadContactDto,
  ) {
    await this.requireScopedLead(actor, leadId);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException("Contact name is required");

    return this.prisma.leadContact.create({
      data: {
        leadId,
        name,
        title: optionalText(dto.title) ?? null,
        phone: optionalText(dto.phone) ?? null,
        email: optionalText(dto.email)?.toLowerCase() ?? null,
      },
      select: CONTACT_SELECT,
    });
  }

  async updateContact(
    actor: AdminAuth,
    leadId: string,
    contactId: string,
    dto: UpdateLeadContactDto,
  ) {
    await this.requireScopedLead(actor, leadId);
    const existing = await this.prisma.leadContact.findFirst({
      where: { id: contactId, leadId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Contact not found");

    const data: Prisma.LeadContactUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException("Contact name is required");
      data.name = name;
    }
    if (dto.title !== undefined) data.title = optionalText(dto.title) ?? null;
    if (dto.phone !== undefined) data.phone = optionalText(dto.phone) ?? null;
    if (dto.email !== undefined) {
      data.email = optionalText(dto.email)?.toLowerCase() ?? null;
    }

    return this.prisma.leadContact.update({
      where: { id: contactId },
      data,
      select: CONTACT_SELECT,
    });
  }

  async deleteContact(actor: AdminAuth, leadId: string, contactId: string) {
    await this.requireScopedLead(actor, leadId);
    const existing = await this.prisma.leadContact.findFirst({
      where: { id: contactId, leadId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Contact not found");

    await this.prisma.leadContact.delete({ where: { id: contactId } });
    return { deleted: true as const };
  }

  async listFollowUps(actor: AdminAuth, leadId: string) {
    await this.requireScopedLead(actor, leadId);
    return this.prisma.leadFollowUp.findMany({
      where: { leadId },
      select: FOLLOW_UP_SELECT,
      orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }],
    });
  }

  async scheduleFollowUp(
    actor: AdminAuth,
    leadId: string,
    dto: CreateLeadFollowUpDto,
  ) {
    const lead = await this.requireScopedLead(actor, leadId);
    const dueAt = optionalDate(dto.dueAt);
    if (!dueAt) throw new BadRequestException("dueAt is required");
    const notes = optionalText(dto.notes) ?? null;

    const promoteStatus = FOLLOW_UP_PROMOTE_STATUSES.includes(lead.status);

    const [followUp] = await this.prisma.$transaction([
      this.prisma.leadFollowUp.create({
        data: {
          leadId,
          createdById: actor.id,
          createdByName: actor.name,
          dueAt,
          notes,
        },
        select: FOLLOW_UP_SELECT,
      }),
      this.prisma.leadActivity.create({
        data: {
          leadId,
          authorId: actor.id,
          authorName: actor.name,
          type: LeadActivityType.FOLLOW_UP_SCHEDULED,
          body: notes
            ? `Follow-up scheduled for ${dueAt.toISOString()}. ${notes}`
            : `Follow-up scheduled for ${dueAt.toISOString()}.`,
        },
        select: ACTIVITY_SELECT,
      }),
      this.prisma.lead.update({
        where: { id: leadId },
        data: {
          followUpAt: dueAt,
          followUpNotes: notes,
          ...(promoteStatus ? { status: LeadStatus.CALLBACK_REQUIRED } : {}),
        },
      }),
    ]);

    return followUp;
  }

  /**
   * A13 — Mark the lead’s manual CRM appointment completed.
   * Keeps appointmentAt; sets status APPOINTMENT_COMPLETED + appointmentCompletedAt.
   */
  async completeAppointment(
    actor: AdminAuth,
    leadId: string,
    dto: CompleteLeadAppointmentDto = {},
  ) {
    const existing = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        ownerId: true,
        appointmentAt: true,
        appointmentNotes: true,
        appointmentCompletedAt: true,
        status: true,
      },
    });
    if (!existing) throw new NotFoundException("Lead not found");
    if (!this.isAdmin(actor) && existing.ownerId !== actor.id) {
      throw new NotFoundException("Lead not found");
    }
    if (!existing.appointmentAt) {
      throw new BadRequestException(
        "Schedule an appointment before marking it completed",
      );
    }
    if (
      existing.status === LeadStatus.APPOINTMENT_COMPLETED &&
      existing.appointmentCompletedAt
    ) {
      throw new BadRequestException("Appointment is already completed");
    }

    const completedAt = new Date();
    const note = optionalText(dto.notes);
    const when = existing.appointmentAt.toISOString();
    const body = note
      ? `Appointment completed (${when}). ${note}`
      : `Appointment completed (${when}).`;

    await this.prisma.$transaction([
      this.prisma.lead.update({
        where: { id: leadId },
        data: {
          status: LeadStatus.APPOINTMENT_COMPLETED,
          appointmentCompletedAt: completedAt,
        },
      }),
      this.prisma.leadActivity.create({
        data: {
          leadId,
          authorId: actor.id,
          authorName: actor.name,
          type: LeadActivityType.APPOINTMENT_COMPLETED,
          body,
        },
        select: ACTIVITY_SELECT,
      }),
    ]);

    return this.getById(actor, leadId);
  }

  async completeFollowUp(actor: AdminAuth, leadId: string, followUpId: string) {
    await this.requireScopedLead(actor, leadId);

    const followUp = await this.prisma.leadFollowUp.findFirst({
      where: { id: followUpId, leadId },
      select: FOLLOW_UP_SELECT,
    });
    if (!followUp) throw new NotFoundException("Follow-up not found");
    if (followUp.completedAt) {
      throw new BadRequestException("Follow-up is already completed");
    }

    const completedAt = new Date();

    const [updated] = await this.prisma.$transaction([
      this.prisma.leadFollowUp.update({
        where: { id: followUpId },
        data: {
          completedAt,
          completedById: actor.id,
          completedByName: actor.name,
        },
        select: FOLLOW_UP_SELECT,
      }),
      this.prisma.leadActivity.create({
        data: {
          leadId,
          authorId: actor.id,
          authorName: actor.name,
          type: LeadActivityType.FOLLOW_UP_COMPLETED,
          body: followUp.notes
            ? `Follow-up completed. ${followUp.notes}`
            : "Follow-up completed.",
        },
        select: ACTIVITY_SELECT,
      }),
    ]);

    const nextOpen = await this.prisma.leadFollowUp.findFirst({
      where: { leadId, completedAt: null },
      orderBy: { dueAt: "asc" },
      select: { dueAt: true, notes: true },
    });

    await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        followUpAt: nextOpen?.dueAt ?? null,
        followUpNotes: nextOpen?.notes ?? null,
      },
    });

    return updated;
  }

  /**
   * CRM dashboard totals. Follow-ups and appointments come only from manual
   * lead CRM fields/records — never from the website booking Appointment table.
   */
  async totals(actor: AdminAuth) {
    const scope = this.ownerScope(actor);
    const { start, end, now } = this.utcDayBounds();

    const followUpLeadFilter: Prisma.LeadWhereInput = {
      ...scope,
      status: { notIn: INACTIVE_LEAD_STATUSES },
    };

    const [
      activeLeads,
      followUpsDueToday,
      followUpsOverdue,
      upcomingAppointments,
    ] = await Promise.all([
      this.prisma.lead.count({
        where: {
          ...scope,
          status: { notIn: INACTIVE_LEAD_STATUSES },
        },
      }),
      this.prisma.leadFollowUp.count({
        where: {
          completedAt: null,
          dueAt: { gte: start, lt: end },
          lead: followUpLeadFilter,
        },
      }),
      this.prisma.leadFollowUp.count({
        where: {
          completedAt: null,
          dueAt: { lt: start },
          lead: followUpLeadFilter,
        },
      }),
      this.prisma.lead.count({
        where: {
          ...scope,
          status: LeadStatus.ZOOM_SCHEDULED,
          appointmentAt: { gte: now },
        },
      }),
    ]);

    return {
      activeLeads,
      followUpsDueToday,
      followUpsOverdue,
      upcomingAppointments,
    };
  }
}
