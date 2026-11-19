import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  CrmStaffGuard,
  JwtAuthGuard,
  SuperAdminGuard,
} from "../../common/guards/jwt-auth.guard";
import type { AdminAuth } from "../../common/interfaces/admin-auth.interface";
import {
  AssignLeadDto,
  CheckLeadDuplicatesQueryDto,
  CompleteLeadAppointmentDto,
  CreateLeadActivityDto,
  CreateLeadCallDto,
  CreateLeadContactDto,
  CreateLeadDto,
  CreateLeadFollowUpDto,
  ListLeadsQueryDto,
  UpdateLeadContactDto,
  UpdateLeadDto,
} from "./dto/lead.dto";
import { LeadsService } from "./leads.service";

@ApiTags("Leads")
@ApiSecurity("access-cookie")
@ApiUnauthorizedResponse({ description: "Missing or invalid auth cookie" })
@ApiForbiddenResponse({
  description: "Master Admin or Sales Representative access required",
})
@UseGuards(JwtAuthGuard, CrmStaffGuard)
@Controller("leads")
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get("assignees")
  @ApiOperation({
    summary:
      "List active Sales Representatives for assignment (Master Admin; empty for reps)",
  })
  @ApiOkResponse({ description: "Assignable owners" })
  listAssignees(@CurrentUser() user: AdminAuth) {
    return this.leadsService.listAssignableOwners(user);
  }

  @Get("totals")
  @ApiOperation({
    summary:
      "CRM dashboard totals (Active Leads, Follow-Ups Due Today, Overdue, Upcoming Appointments). Manual CRM only — excludes website booking appointments.",
  })
  @ApiOkResponse({ description: "Scoped totals for the current actor" })
  totals(@CurrentUser() user: AdminAuth) {
    return this.leadsService.totals(user);
  }

  @Get("duplicates")
  @ApiOperation({
    summary:
      "A5 — Soft duplicate preview by company name, website, and/or phone (org-wide)",
  })
  @ApiOkResponse({ description: "{ duplicates: [...] }" })
  checkDuplicates(@Query() query: CheckLeadDuplicatesQueryDto) {
    return this.leadsService.checkDuplicates(query);
  }

  @Get("export")
  @ApiOperation({
    summary:
      "A5 — CSV export (reps: own leads; Master Admin: all). Same filters as GET /leads.",
  })
  @ApiProduces("text/csv")
  @ApiOkResponse({ description: "CSV file download" })
  @Header("Content-Type", "text/csv; charset=utf-8")
  async exportCsv(
    @CurrentUser() user: AdminAuth,
    @Query() query: ListLeadsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { filename, csv } = await this.leadsService.exportCsv(user, query);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return csv;
  }

  @Get()
  @ApiOperation({
    summary:
      "List leads (reps: own only; Master Admin: all). Supports q/status/ownerId and totals click-through filter.",
  })
  @ApiOkResponse({
    description:
      "Leads for the current scope. filter=active|follow_ups_due_today|follow_ups_overdue|upcoming_appointments",
  })
  list(@CurrentUser() user: AdminAuth, @Query() query: ListLeadsQueryDto) {
    return this.leadsService.list(user, query);
  }

  @Get(":id/activities")
  @ApiOperation({
    summary: "List append-only activity history for a lead (newest first)",
  })
  @ApiOkResponse({ description: "Activities" })
  @ApiNotFoundResponse({ description: "Lead not found" })
  listActivities(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.leadsService.listActivities(user, id);
  }

  @Post(":id/activities")
  @ApiOperation({
    summary:
      "Add a call / email / meeting / note (append-only; author preserved)",
  })
  @ApiOkResponse({ description: "Created activity" })
  @ApiNotFoundResponse({ description: "Lead not found" })
  addActivity(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateLeadActivityDto,
  ) {
    return this.leadsService.addActivity(user, id, dto);
  }

  @Get(":id/calls")
  @ApiOperation({
    summary:
      "A9 — List permanent call disposition history for a lead (newest first)",
  })
  @ApiOkResponse({ description: "Call logs with disposition" })
  @ApiNotFoundResponse({ description: "Lead not found" })
  listCalls(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.leadsService.listCalls(user, id);
  }

  @Post(":id/calls")
  @ApiOperation({
    summary:
      "A9 — Log a call with permanent disposition (optionally update Current Status; never overwrites past call rows)",
  })
  @ApiOkResponse({ description: "Created call log" })
  @ApiNotFoundResponse({ description: "Lead not found" })
  logCall(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateLeadCallDto,
  ) {
    return this.leadsService.logCall(user, id, dto);
  }

  @Get(":id/contacts")
  @ApiOperation({
    summary: "A10 — List contacts for a company/prospect (name order)",
  })
  @ApiOkResponse({ description: "Contacts" })
  @ApiNotFoundResponse({ description: "Lead not found" })
  listContacts(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.leadsService.listContacts(user, id);
  }

  @Post(":id/contacts")
  @ApiOperation({ summary: "A10 — Add a contact under this company" })
  @ApiOkResponse({ description: "Created contact" })
  @ApiNotFoundResponse({ description: "Lead not found" })
  createContact(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateLeadContactDto,
  ) {
    return this.leadsService.createContact(user, id, dto);
  }

  @Patch(":id/contacts/:contactId")
  @ApiOperation({ summary: "A10 — Update a contact on this company" })
  @ApiOkResponse({ description: "Updated contact" })
  @ApiNotFoundResponse({ description: "Lead or contact not found" })
  updateContact(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("contactId", ParseUUIDPipe) contactId: string,
    @Body() dto: UpdateLeadContactDto,
  ) {
    return this.leadsService.updateContact(user, id, contactId, dto);
  }

  @Delete(":id/contacts/:contactId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "A10 — Delete a contact (linked call rows keep history; contactId set null)",
  })
  @ApiOkResponse({ description: "{ deleted: true }" })
  @ApiNotFoundResponse({ description: "Lead or contact not found" })
  deleteContact(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("contactId", ParseUUIDPipe) contactId: string,
  ) {
    return this.leadsService.deleteContact(user, id, contactId);
  }

  @Get(":id/follow-ups")
  @ApiOperation({
    summary: "List follow-ups for a lead (open first, then by due)",
  })
  @ApiOkResponse({ description: "Follow-ups" })
  @ApiNotFoundResponse({ description: "Lead not found" })
  listFollowUps(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.leadsService.listFollowUps(user, id);
  }

  @Post(":id/follow-ups")
  @ApiOperation({
    summary:
      "Schedule a follow-up; writes a timeline activity and syncs lead.followUpAt",
  })
  @ApiOkResponse({ description: "Created follow-up" })
  @ApiNotFoundResponse({ description: "Lead not found" })
  scheduleFollowUp(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateLeadFollowUpDto,
  ) {
    return this.leadsService.scheduleFollowUp(user, id, dto);
  }

  @Post(":id/follow-ups/:followUpId/complete")
  @ApiOperation({
    summary: "Mark a follow-up complete; writes a timeline activity",
  })
  @ApiOkResponse({ description: "Completed follow-up" })
  @ApiNotFoundResponse({ description: "Lead or follow-up not found" })
  completeFollowUp(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("followUpId", ParseUUIDPipe) followUpId: string,
  ) {
    return this.leadsService.completeFollowUp(user, id, followUpId);
  }

  @Post(":id/appointment/complete")
  @ApiOperation({
    summary:
      "A13 — Mark the lead’s manual CRM appointment completed (keeps appointmentAt; sets Appointment Completed status)",
  })
  @ApiOkResponse({ description: "Lead with appointmentCompletedAt + status" })
  @ApiNotFoundResponse({ description: "Lead not found" })
  completeAppointment(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CompleteLeadAppointmentDto,
  ) {
    return this.leadsService.completeAppointment(user, id, dto);
  }

  @Post(":id/assign")
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary:
      "A11 — Assign / reassign a lead to an EADS (Master Admin only; supports unassigned → specialist)",
  })
  @ApiOkResponse({ description: "Lead with updated owner" })
  @ApiForbiddenResponse({ description: "Master Admin required" })
  @ApiNotFoundResponse({ description: "Lead not found" })
  assign(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignLeadDto,
  ) {
    return this.leadsService.assign(user, id, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one lead by id (scoped)" })
  @ApiOkResponse({ description: "Lead detail" })
  @ApiNotFoundResponse({ description: "Lead not found" })
  getOne(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.leadsService.getById(user, id);
  }

  @Post()
  @ApiOperation({
    summary:
      "Create a lead (companyName required; Admin may omit ownerId for unassigned; EADS always self; default NEW_PROSPECT). Returns 409 LEAD_DUPLICATES unless acknowledgeDuplicates=true.",
  })
  @ApiOkResponse({ description: "Created lead" })
  @ApiConflictResponse({
    description:
      "Possible duplicates — resubmit with acknowledgeDuplicates=true",
  })
  create(@CurrentUser() user: AdminAuth, @Body() dto: CreateLeadDto) {
    return this.leadsService.create(user, dto);
  }

  @Patch(":id")
  @ApiOperation({
    summary:
      "Update a lead (empty string clears optional text fields; Admin may reassign ownerId). Returns 409 LEAD_DUPLICATES when company/website/phone collide unless acknowledgeDuplicates=true.",
  })
  @ApiOkResponse({ description: "Updated lead" })
  @ApiNotFoundResponse({ description: "Lead not found" })
  @ApiConflictResponse({
    description:
      "Possible duplicates — resubmit with acknowledgeDuplicates=true",
  })
  update(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(user, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a lead (scoped)" })
  @ApiOkResponse({ description: "{ deleted: true }" })
  @ApiNotFoundResponse({ description: "Lead not found" })
  remove(
    @CurrentUser() user: AdminAuth,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.leadsService.remove(user, id);
  }
}
