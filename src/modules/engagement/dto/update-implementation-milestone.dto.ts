import { PartialType } from "@nestjs/swagger";
import { CreateImplementationMilestoneDto } from "./create-implementation-milestone.dto";

export class UpdateImplementationMilestoneDto extends PartialType(
  CreateImplementationMilestoneDto,
) {}
