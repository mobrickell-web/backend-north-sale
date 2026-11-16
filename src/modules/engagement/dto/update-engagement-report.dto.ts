import { PartialType } from "@nestjs/swagger";
import { CreateEngagementReportDto } from "./create-engagement-report.dto";

export class UpdateEngagementReportDto extends PartialType(
  CreateEngagementReportDto,
) {}
