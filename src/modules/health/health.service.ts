import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../database/prisma.service";
import { parsePublicKey } from "../webhooks/sendgrid-signature";

/** A health probe that hangs is worse than no probe — Railway would treat the
 *  container as dead and restart it mid-request. Every check is capped. */
const DB_TIMEOUT_MS = 3_000;

export type CheckState = "up" | "degraded" | "down";

export type DatabaseCheck = {
  state: CheckState;
  latencyMs: number | null;
  adminUsers: number | null;
  detail: string;
};

export type MailCheck = {
  state: CheckState;
  dryRun: boolean;
  /** Values are deliberately never returned — only whether they are set. */
  configured: boolean;
  detail: string;
};

export type WebhookCheck = {
  state: CheckState;
  detail: string;
};

/**
 * A webhook that silently rejects everything is worse than no webhook at all —
 * bounce visibility would look "fine" forever. Surfaced here so a missing key
 * is caught before the first real bounce arrives.
 */
export type HealthReport = {
  status: "ok" | "error";
  service: string;
  environment: string;
  nodeVersion: string;
  uptimeSeconds: number;
  timestamp: string;
  checks: {
    database: DatabaseCheck;
    mail: MailCheck;
    webhooks: WebhookCheck;
  };
};

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly bootedAt = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Liveness: is this process able to serve traffic at all? Deliberately does
   * NOT touch the database — a dependency outage must not cause a restart loop
   * when the process itself is healthy and would recover on its own.
   */
  liveness() {
    return {
      status: "ok" as const,
      service: "north-sales-api",
      uptimeSeconds: Math.floor((Date.now() - this.bootedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness: can we actually serve a booking request? Counts admins, which
   * validates connectivity AND that migrations have been applied.
   */
  async readiness() {
    const database = await this.checkDatabase();
    const ok = database.state === "up";
    return {
      status: ok ? ("ok" as const) : ("error" as const),
      service: "north-sales-api",
      timestamp: new Date().toISOString(),
      checks: { database },
    };
  }

  async report(): Promise<HealthReport> {
    const [database, mail] = await Promise.all([
      this.checkDatabase(),
      Promise.resolve(this.checkMail()),
    ]);
    const webhooks = this.checkWebhooks();

    // Mail or webhooks being unconfigured degrades but must not fail the whole
    // report — booking writes to the DB first and emails are fire-and-forget.
    const status =
      database.state === "up" &&
      mail.state !== "down" &&
      webhooks.state !== "down"
        ? "ok"
        : "error";

    return {
      status,
      service: "north-sales-api",
      environment: process.env.NODE_ENV ?? "development",
      nodeVersion: process.version,
      uptimeSeconds: Math.floor((Date.now() - this.bootedAt) / 1000),
      timestamp: new Date().toISOString(),
      checks: { database, mail, webhooks },
    };
  }

  private checkWebhooks(): WebhookCheck {
    const key = this.config.get<string>("webhooks.sendgridPublicKey");
    const parsed = parsePublicKey(key);

    if (!parsed) {
      return {
        state: "down",
        detail:
          "SENDGRID_WEBHOOK_PUBLIC_KEY is not set — the SendGrid webhook will reject every delivery event.",
      };
    }

    return {
      state: "up",
      detail: "SendGrid signature verification key loaded.",
    };
  }

  private async checkDatabase(): Promise<DatabaseCheck> {
    const startedAt = Date.now();

    try {
      const rows = await this.withTimeout(
        // Cast to text: COUNT returns bigint over the pg adapter.
        this.prisma.$queryRaw<{ admins: string }[]>`
          SELECT COUNT(*)::text AS admins FROM admin_users
        `,
        DB_TIMEOUT_MS,
      );

      const latencyMs = Date.now() - startedAt;
      const adminUsers = Number(rows[0]?.admins ?? 0);

      if (adminUsers === 0) {
        return {
          state: "degraded",
          latencyMs,
          adminUsers,
          detail: "Connected, but no admin users exist — seed has not run.",
        };
      }

      return {
        state: "up",
        latencyMs,
        adminUsers,
        detail: "Connected and schema present.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const timedOut = message.includes("timed out");

      this.logger.warn(
        `Health: database ${timedOut ? "timeout" : "error"}: ${message}`,
      );

      return {
        state: "down",
        latencyMs: Date.now() - startedAt,
        adminUsers: null,
        detail: timedOut
          ? `No response within ${DB_TIMEOUT_MS}ms.`
          : // "relation does not exist" means the container is fine but
            // `prisma migrate deploy` has not run yet.
            message.includes("does not exist")
            ? "Connected, but tables are missing — run `prisma migrate deploy`."
            : message,
      };
    }
  }

  private checkMail(): MailCheck {
    const host = this.config.get<string>("mail.host");
    const user = this.config.get<string>("mail.user");
    const pass = this.config.get<string>("mail.pass");
    const from = this.config.get<string>("mail.from");
    const notifyTo = this.config.get<string>("mail.notifyTo");
    const dryRun = this.config.get<boolean>("mail.dryRun") ?? false;

    const missing = [
      ["SMTP_HOST", host],
      ["SMTP_USER", user],
      ["SMTP_PASS", pass],
      ["SMTP_FROM", from],
      ["SMTP_TO", notifyTo],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length > 0) {
      return {
        state: "down",
        dryRun,
        configured: false,
        detail: `Missing: ${missing.join(", ")}. Appointments will save but no email will send.`,
      };
    }

    return {
      state: dryRun ? "degraded" : "up",
      dryRun,
      configured: true,
      detail: dryRun
        ? "Configured, but MAIL_DRY_RUN=true — emails are logged, not sent."
        : "Configured.",
    };
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Health check timed out after ${ms}ms`)),
        ms,
      );
    });

    // Clear the timer whichever way the promise settles, otherwise a fast DB
    // response still leaves the event loop held open until the timeout fires.
    return Promise.race([promise, timeout]).finally(() => {
      if (timer) clearTimeout(timer);
    }) as Promise<T>;
  }
}
