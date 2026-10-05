import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import { Header, Res } from "@nestjs/common";
import { AppointmentsService } from "./appointments.service";
import {
  CancelAppointmentDto,
  CreateAppointmentDto,
  RescheduleAppointmentDto,
} from "./dto/create-appointment.dto";

@ApiTags("Public Appointments")
@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Book a new appointment (public, no auth)" })
  @ApiCreatedResponse({ description: "Appointment created" })
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  @Get("manage/:token")
  @ApiOperation({ summary: "Get booking details for a reschedule/cancel link" })
  @ApiOkResponse({ description: "Appointment details" })
  @ApiNotFoundResponse({ description: "Appointment not found" })
  manage(@Param("token") token: string) {
    return this.appointmentsService.manage(token);
  }

  @Get(":token/calendar.ics")
  @Header("Content-Type", "text/calendar; charset=utf-8")
  @ApiOperation({
    summary: "Download an .ics calendar file for this appointment",
  })
  @ApiProduces("text/calendar")
  @ApiOkResponse({ description: "iCalendar file" })
  @ApiNotFoundResponse({ description: "Invalid or unknown token" })
  async calendar(
    @Param("token") token: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const { filename, content } =
      await this.appointmentsService.calendarIcs(token);

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return content;
  }

  @Patch(":token/reschedule")
  @ApiOperation({ summary: "Prospect reschedules via their unique email link" })
  @ApiOkResponse({ description: "Appointment rescheduled" })
  @ApiNotFoundResponse({ description: "Invalid or unknown token" })
  reschedule(
    @Param("token") token: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointmentsService.reschedule(token, dto);
  }

  @Delete(":token/cancel")
  @ApiOperation({ summary: "Prospect cancels via their unique email link" })
  @ApiOkResponse({ description: "Appointment cancelled" })
  @ApiNotFoundResponse({ description: "Invalid or unknown token" })
  cancel(@Param("token") token: string, @Body() dto?: CancelAppointmentDto) {
    return this.appointmentsService.cancel(token, dto);
  }
}
