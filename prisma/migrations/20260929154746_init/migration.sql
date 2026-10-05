-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('INITIAL_CONSULTATION', 'SALES_PERFORMANCE_DISCUSSION', 'SALES_PERFORMANCE_REVIEW', 'FOLLOW_UP_MEETING');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('BOOKED', 'RESCHEDULED_BY_PROSPECT', 'RESCHEDULED_BY_ADMIN', 'CANCELLED_BY_PROSPECT', 'CANCELLED_BY_ADMIN', 'CONFIRMATION_EMAIL_SENT', 'REMINDER_24H_SENT', 'REMINDER_1H_SENT', 'EMAIL_RESENT_BY_ADMIN');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SUPER_ADMIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "contact_name" VARCHAR(150) NOT NULL,
    "company_name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "notes" TEXT,
    "appointment_type" "AppointmentType" NOT NULL DEFAULT 'INITIAL_CONSULTATION',
    "duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "scheduled_at_utc" TIMESTAMPTZ(6) NOT NULL,
    "prospect_timezone" VARCHAR(100) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "reschedule_token" UUID NOT NULL,
    "cancel_token" UUID NOT NULL,
    "cancellation_reason" TEXT,
    "reminder_24h_sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder_24h_sent_at" TIMESTAMPTZ(6),
    "reminder_1h_sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder_1h_sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_logs" (
    "id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "action" "ActionType" NOT NULL,
    "previous_time" TIMESTAMPTZ(6),
    "new_time" TIMESTAMPTZ(6),
    "notes" TEXT,
    "admin_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_reschedule_token_key" ON "appointments"("reschedule_token");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_cancel_token_key" ON "appointments"("cancel_token");

-- CreateIndex
CREATE INDEX "idx_appointment_schedule_status" ON "appointments"("scheduled_at_utc", "status");

-- CreateIndex
CREATE INDEX "idx_appointment_email" ON "appointments"("email");

-- CreateIndex
CREATE INDEX "idx_appointment_reschedule_token" ON "appointments"("reschedule_token");

-- CreateIndex
CREATE INDEX "idx_appointment_cancel_token" ON "appointments"("cancel_token");

-- CreateIndex
CREATE INDEX "idx_log_appointment_id" ON "appointment_logs"("appointment_id");

-- AddForeignKey
ALTER TABLE "appointment_logs" ADD CONSTRAINT "appointment_logs_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_logs" ADD CONSTRAINT "appointment_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
