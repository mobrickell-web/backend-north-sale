import { Module } from "@nestjs/common";
import {
  ClientUserGuard,
  RepOrAdminGuard,
  SuperAdminGuard,
} from "../../common/guards/jwt-auth.guard";
import { AdminAssessmentInstancesController } from "./admin/admin-assessment-instances.controller";
import { AdminAssessmentsController } from "./admin/admin-assessments.controller";
import { AdminAssessmentsService } from "./admin/admin-assessments.service";
import { AssessmentInstancesService } from "./assessment-instances.service";
import { AssessmentScoringService } from "./assessment-scoring.service";
import { AssessmentsController } from "./assessments.controller";
import { AssessmentsService } from "./assessments.service";
import { ClientAssessmentController } from "./client/client-assessment.controller";
import { OnBehalfAssessmentController } from "./on-behalf/on-behalf-assessment.controller";

@Module({
  controllers: [
    AssessmentsController,
    AdminAssessmentsController,
    AdminAssessmentInstancesController,
    ClientAssessmentController,
    OnBehalfAssessmentController,
  ],
  providers: [
    AssessmentsService,
    AdminAssessmentsService,
    AssessmentScoringService,
    AssessmentInstancesService,
    SuperAdminGuard,
    ClientUserGuard,
    RepOrAdminGuard,
  ],
  exports: [
    AssessmentsService,
    AdminAssessmentsService,
    AssessmentInstancesService,
    AssessmentScoringService,
  ],
})
export class AssessmentsModule {}
