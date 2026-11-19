-- A6: website bookings await Master Admin accept/reject.
-- Note: PostgreSQL appends enum values; schema lists PENDING first for clarity.
ALTER TYPE "AppointmentStatus" ADD VALUE 'PENDING';
ALTER TYPE "ActionType" ADD VALUE 'ACCEPTED_BY_ADMIN';
ALTER TYPE "ActionType" ADD VALUE 'REJECTED_BY_ADMIN';
