import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import type { CreateLeadDto, UpdateLeadDto } from "./dto/lead.dto";

const LEAD_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

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

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  list(ownerId: string) {
    return this.prisma.lead.findMany({
      where: { ownerId },
      select: LEAD_SELECT,
      orderBy: { createdAt: "desc" },
    });
  }

  create(ownerId: string, dto: CreateLeadDto) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException("Name is required");
    }
    return this.prisma.lead.create({
      data: {
        ownerId,
        name,
        email: optionalText(dto.email) ?? null,
        phone: optionalText(dto.phone) ?? null,
        address: optionalText(dto.address) ?? null,
        notes: optionalText(dto.notes) ?? null,
      },
      select: LEAD_SELECT,
    });
  }

  async update(ownerId: string, id: string, dto: UpdateLeadDto) {
    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException("Name is required");
    }
    // Scoping the write by owner means another user's lead id is a 404.
    const result = await this.prisma.lead.updateMany({
      where: { id, ownerId },
      data: {
        name,
        email: optionalText(dto.email),
        phone: optionalText(dto.phone),
        address: optionalText(dto.address),
        notes: optionalText(dto.notes),
      },
    });
    if (result.count !== 1) {
      throw new NotFoundException("Lead not found");
    }
    const lead = await this.prisma.lead.findFirst({
      where: { id, ownerId },
      select: LEAD_SELECT,
    });
    if (!lead) {
      throw new NotFoundException("Lead not found");
    }
    return lead;
  }

  async remove(ownerId: string, id: string): Promise<{ deleted: true }> {
    const result = await this.prisma.lead.deleteMany({
      where: { id, ownerId },
    });
    if (result.count !== 1) {
      throw new NotFoundException("Lead not found");
    }
    return { deleted: true };
  }
}
