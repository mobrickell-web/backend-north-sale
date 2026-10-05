import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { AdminAuth } from "../interfaces/admin-auth.interface";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminAuth | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AdminAuth }>();
    return request.user;
  },
);
