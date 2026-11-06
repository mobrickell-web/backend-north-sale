import type { Role, StaffPosition } from "../../generated/prisma/enums";

export interface AdminAuth {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Staff position for SALES_REPRESENTATIVE accounts; null otherwise. */
  position: StaffPosition | null;
}
