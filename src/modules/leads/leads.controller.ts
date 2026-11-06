import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  AccountExecutiveGuard,
  JwtAuthGuard,
} from "../../common/guards/jwt-auth.guard";
import type { AdminAuth } from "../../common/interfaces/admin-auth.interface";
import { CreateLeadDto, UpdateLeadDto } from "./dto/lead.dto";
import { LeadsService } from "./leads.service";

@ApiTags("Leads")
@ApiSecurity("access-cookie")
@ApiUnauthorizedResponse({ description: "Missing or invalid auth cookie" })
@ApiForbiddenResponse({ description: "Account Executive access required" })
@UseGuards(JwtAuthGuard, AccountExecutiveGuard)
@Controller("leads")
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @ApiOperation({ summary: "List the current Account Executive's leads" })
  @ApiOkResponse({ description: "Leads owned by the caller, newest first" })
  list(@CurrentUser() user: AdminAuth) {
    return this.leadsService.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: "Create a lead owned by the caller" })
  @ApiOkResponse({ description: "Created lead" })
  create(@CurrentUser() user: AdminAuth, @Body() dto: CreateLeadDto) {
    return this.leadsService.create(user.id, dto);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Update a lead (an empty string clears an optional field)",
  })
  @ApiOkResponse({ description: "Updated lead" })
  @ApiNotFoundResponse({ description: "Lead not found" })
  update(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(user.id, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a lead" })
  @ApiOkResponse({ description: "{ deleted: true }" })
  @ApiNotFoundResponse({ description: "Lead not found" })
  remove(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.leadsService.remove(user.id, id);
  }
}
