import { StaffPosition } from "../../generated/prisma/enums";

export const STAFF_POSITIONS = [
  StaffPosition.EXECUTIVE_ACCOUNT_DEVELOPMENT_SPECIALIST,
  StaffPosition.IMPLEMENTATION_SPECIALIST,
  StaffPosition.FRACTIONAL_VP,
  StaffPosition.REGIONAL_SALES_MANAGER,
  StaffPosition.OFFICE_MANAGER,
] as const;

/** Human-readable labels for Access Management + login Access Type. */
export const STAFF_POSITION_LABELS: Record<StaffPosition, string> = {
  [StaffPosition.EXECUTIVE_ACCOUNT_DEVELOPMENT_SPECIALIST]:
    "Executive Account Development Specialist",
  [StaffPosition.IMPLEMENTATION_SPECIALIST]:
    "Sales Performance Implementation Specialist",
  [StaffPosition.FRACTIONAL_VP]: "Fractional VP of Sales",
  [StaffPosition.REGIONAL_SALES_MANAGER]: "Regional Sales Manager",
  [StaffPosition.OFFICE_MANAGER]: "Office Manager",
};

/** Emails Master Admin must not use when creating client / staff accounts. */
export const BLOCKED_ACCOUNT_EMAILS = new Set(["gotohell@gmail.com"]);

/** Staff positions selectable on the login Access Type dropdown. */
export const LOGIN_STAFF_POSITIONS = [
  StaffPosition.EXECUTIVE_ACCOUNT_DEVELOPMENT_SPECIALIST,
  StaffPosition.IMPLEMENTATION_SPECIALIST,
  StaffPosition.FRACTIONAL_VP,
  StaffPosition.REGIONAL_SALES_MANAGER,
  StaffPosition.OFFICE_MANAGER,
] as const;

/** Access types accepted by the password login form. */
export const LOGIN_CATEGORIES = [
  "CLIENT",
  ...LOGIN_STAFF_POSITIONS,
  "MASTER_ADMIN",
] as const;

export type LoginCategory = (typeof LOGIN_CATEGORIES)[number];

/** Google sign-in additionally accepts OTHER, which is always rejected. */
export const GOOGLE_LOGIN_CATEGORIES = [...LOGIN_CATEGORIES, "OTHER"] as const;

export type GoogleLoginCategory = (typeof GOOGLE_LOGIN_CATEGORIES)[number];
