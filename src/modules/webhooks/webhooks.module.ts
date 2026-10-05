import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { SendGridWebhookController } from "./sendgrid-webhook.controller";

@Module({
  imports: [PrismaModule],
  controllers: [SendGridWebhookController],
})
export class WebhooksModule {}
