import { PartialType } from "@nestjs/swagger";
import { CreateBaselineMetricDto } from "./create-baseline-metric.dto";

export class UpdateBaselineMetricDto extends PartialType(
  CreateBaselineMetricDto,
) {}
