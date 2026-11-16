import { PartialType } from "@nestjs/swagger";
import { CreateKpiMeasurementDto } from "./create-kpi-measurement.dto";

export class UpdateKpiMeasurementDto extends PartialType(
  CreateKpiMeasurementDto,
) {}
