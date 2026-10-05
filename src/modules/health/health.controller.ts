import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { HealthService } from "./health.service";

@ApiTags("Health")
@Controller("health")
// Probes run every few seconds from the platform and from curl loops. Counting
// them against the 50/min global limit would throttle real user traffic.
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: "Full health report (database, mail config, uptime)",
  })
  @ApiOkResponse({ description: "Service healthy" })
  @ApiServiceUnavailableResponse({ description: "A dependency is down" })
  async report() {
    const report = await this.healthService.report();
    // Non-2xx so orchestrators and uptime monitors can alert on the status code.
    // Wrapped in `{ message }` because AllExceptionsFilter only copies the
    // `message` key out of the exception payload — a bare object would be
    // dropped and the client would see a bare "Internal server error".
    if (report.status === "error") {
      throw new ServiceUnavailableException({ message: report });
    }
    return report;
  }

  @Get("live")
  @ApiOperation({
    summary: "Liveness probe — process is up (no dependency checks)",
  })
  @ApiOkResponse({ description: "Process is alive" })
  live() {
    return this.healthService.liveness();
  }

  @Get("ready")
  @ApiOperation({
    summary: "Readiness probe — database reachable and migrated",
  })
  @ApiOkResponse({ description: "Ready to serve traffic" })
  @ApiServiceUnavailableResponse({ description: "Not ready" })
  async ready() {
    const readiness = await this.healthService.readiness();
    if (readiness.status === "error") {
      throw new ServiceUnavailableException({ message: readiness });
    }
    return readiness;
  }
}
