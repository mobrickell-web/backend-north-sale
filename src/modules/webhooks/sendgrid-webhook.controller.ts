import {
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import type { Request } from "express";
import { PrismaService } from "../../database/prisma.service";
import {
  describeFailure,
  mapEventToStatus,
  type SendGridEvent,
} from "./sendgrid-events";
import {
  SIGNATURE_FAILURE_MESSAGES,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  verifySendGridSignature,
} from "./sendgrid-signature";
import { normalizeMessageId } from "../mail/message-id";

type Summary = {
  received: number;
  applied: number;
  unmatched: number;
  ignored: number;
};

@ApiTags("Webhooks")
@Controller("webhooks")
@SkipThrottle()
export class SendGridWebhookController {
  private readonly logger = new Logger(SendGridWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Post("sendgrid")
  @HttpCode(200)
  @ApiOperation({
    summary: "SendGrid event webhook (authenticated by ECDSA signature)",
  })
  @ApiExcludeEndpoint()
  async receive(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers(SIGNATURE_HEADER) signature: string | undefined,
    @Headers(TIMESTAMP_HEADER) timestamp: string | undefined,
  ): Promise<Summary> {
    const rawBody = request.rawBody;

    // The provider must retry on a non-2xx, so configuration problems are
    // reported as 503 rather than silently dropped.
    if (!this.config.get<string>("webhooks.sendgridPublicKey")) {
      this.logger.error(
        "Rejected SendGrid webhook: SENDGRID_WEBHOOK_PUBLIC_KEY is not set",
      );
      throw new ServiceUnavailableException({
        message: SIGNATURE_FAILURE_MESSAGES.key_not_configured,
      });
    }

    const verdict = verifySendGridSignature({
      publicKey: this.config.get<string>("webhooks.sendgridPublicKey"),
      signature,
      timestamp,
      rawBody,
    });

    if (!verdict.ok) {
      this.logger.warn(
        `Rejected SendGrid webhook: ${verdict.reason} (ip=${request.ip})`,
      );
      throw new UnauthorizedException({
        message: SIGNATURE_FAILURE_MESSAGES[verdict.reason],
      });
    }

    let events: SendGridEvent[];
    try {
      const parsed: unknown = JSON.parse(rawBody?.toString("utf8") ?? "[]");
      events = Array.isArray(parsed) ? parsed : [parsed as SendGridEvent];
    } catch {
      throw new UnauthorizedException({ message: "Malformed payload." });
    }

    const summary: Summary = {
      received: events.length,
      applied: 0,
      unmatched: 0,
      ignored: 0,
    };

    for (const event of events) {
      const outcome = await this.apply(event);
      summary[outcome] += 1;
    }

    this.logger.log(
      `SendGrid webhook: ${summary.received} event(s), ${summary.applied} applied, ` +
        `${summary.unmatched} unmatched, ${summary.ignored} ignored`,
    );

    return summary;
  }

  private async apply(
    event: SendGridEvent,
  ): Promise<"applied" | "unmatched" | "ignored"> {
    const status = event.event ? mapEventToStatus(event.event) : null;
    if (!status) return "ignored";

    // `message_id` is the Twilio-side id that matches what nodemailer gave us;
    // `sg_message_id` is SendGrid's own internal id and will not join.
    const messageId = normalizeMessageId(event.message_id);
    if (!messageId) return "ignored";

    const updated = await this.prisma.emailDelivery.updateMany({
      where: { messageId },
      data: {
        status,
        statusReason: describeFailure(event),
        statusAt: new Date(),
      },
    });

    if (updated.count === 0) {
      this.logger.warn(
        `No email_deliveries row for message_id ${messageId} (event=${event.event})`,
      );
      return "unmatched";
    }

    if (
      status === "BOUNCED" ||
      status === "DROPPED" ||
      status === "SPAMREPORT"
    ) {
      this.logger.warn(
        `Email to ${event.email ?? "unknown"} was ${status}: ${describeFailure(event) ?? "no reason given"}`,
      );
    }

    return "applied";
  }
}
