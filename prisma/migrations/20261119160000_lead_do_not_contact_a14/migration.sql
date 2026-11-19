-- A14 — Distinct Do Not Contact status (gap fill).
-- Does NOT migrate NOT_INTERESTED → DO_NOT_CONTACT (specialists choose going forward).
-- Inactive for Active Leads / follow-up due totals (handled in app INACTIVE_LEAD_STATUSES).

ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'DO_NOT_CONTACT';
