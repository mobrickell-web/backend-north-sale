import {
  Body,
  Controller,
  HttpCode,
  Post,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { MailService } from "../mail/mail.service";
import { CreateContactMessageDto } from "./dto/create-contact-message.dto";

@ApiTags("Public Contact")
@Controller("contact")
export class ContactController {
  constructor(private readonly mailService: MailService) {}

  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Send a website contact-form message (public)" })
  @ApiOkResponse({ description: "Message sent" })
  async create(@Body() dto: CreateContactMessageDto) {
    const sent = await this.mailService.sendContactMessage({
      name: dto.name.trim(),
      email: dto.email.trim(),
      phone: dto.phone?.trim() || undefined,
      company: dto.company?.trim() || undefined,
      message: dto.message.trim(),
    });

    if (!sent) {
      throw new ServiceUnavailableException(
        "Your message could not be sent right now. Please email contact@northpointsalesgroup.com or call 800-696-6971.",
      );
    }

    return { sent: true };
  }
}
