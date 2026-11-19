import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AssessmentResultsController } from "./assessment-results.controller";
import { AssessmentResultsService } from "./assessment-results.service";

@Module({
  imports: [AuthModule],
  controllers: [AssessmentResultsController],
  providers: [AssessmentResultsService],
})
export class AssessmentResultsModule {}
