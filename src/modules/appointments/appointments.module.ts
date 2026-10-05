import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { AdminAppointmentsController } from "./admin/admin-appointments.controller";
import { AdminAppointmentsService } from "./admin/admin-appointments.service";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentsService } from "./appointments.service";
import { RemindersService } from "./reminders.service";

@Module({
  imports: [MailModule],
  controllers: [AppointmentsController, AdminAppointmentsController],
  providers: [AppointmentsService, AdminAppointmentsService, RemindersService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
