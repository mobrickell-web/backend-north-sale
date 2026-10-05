import type { Role } from "../../generated/prisma/enums";

export interface AdminAuth {
  id: string;
  name: string;
  email: string;
  role: Role;
}
