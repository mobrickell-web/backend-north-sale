import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import type { AdminAuth } from "../../../common/interfaces/admin-auth.interface";
import { AdminAppointmentsService } from "./admin-appointments.service";
import {
  AdminAppointmentQueryDto,
  AdminStatusUpdateDto,
} from "./dto/admin-appointment.dto";

@ApiTags("Admin Appointments")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Missing or invalid bearer token" })
@UseGuards(JwtAuthGuard)
@Controller("admin/appointments")
export class AdminAppointmentsController {
  constructor(
    private readonly adminAppointmentsService: AdminAppointmentsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List appointments (tabs: upcoming | completed | cancelled)",
  })
  @ApiOkResponse({ description: "Paginated list of appointments" })
  list(@Query() query: AdminAppointmentQueryDto) {
    return this.adminAppointmentsService.list(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one appointment with its audit log" })
  @ApiOkResponse({
    description:
      "Appointment detail. history[] carries adminUserName for admin-performed actions.",
  })
  detail(@Param("id", ParseUUIDPipe) id: string) {
    return this.adminAppointmentsService.detail(id);
  }

  @Patch(":id/status")
  @ApiOperation({
    summary: "Mark an appointment COMPLETED or CANCELLED (admin action)",
  })
  @ApiOkResponse({ description: "Updated appointment" })
  changeStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AdminStatusUpdateDto,
    @CurrentUser() admin: AdminAuth,
  ) {
    return this.adminAppointmentsService.changeStatus(id, dto, admin);
  }
}
