import { StaffPosition } from "../../generated/prisma/enums";

export const STAFF_POSITIONS = [
  StaffPosition.ACCOUNT_EXECUTIVE,
  StaffPosition.IMPLEMENTATION_SPECIALIST,
  StaffPosition.FRACTIONAL_VP,
  StaffPosition.REGIONAL_SALES_MANAGER,
] as const;

/** Access types accepted by the password login form. */
export const LOGIN_CATEGORIES = [
  "CLIENT",
  ...STAFF_POSITIONS,
  "MASTER_ADMIN",
] as const;

export type LoginCategory = (typeof LOGIN_CATEGORIES)[number];

/** Google sign-in additionally accepts OTHER, which is always rejected. */
export const GOOGLE_LOGIN_CATEGORIES = [...LOGIN_CATEGORIES, "OTHER"] as const;

export type GoogleLoginCategory = (typeof GOOGLE_LOGIN_CATEGORIES)[number];
