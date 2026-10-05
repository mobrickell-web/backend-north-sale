import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { MailService } from "./mail.service";

@Module({
  // PrismaService is injected to persist email_deliveries rows (messageId).
  imports: [PrismaModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
