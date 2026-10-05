import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { Strategy } from "passport-local";
import type { AdminAuth } from "../../../common/interfaces/admin-auth.interface";
import { AuthService } from "../auth.service";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, "local") {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    email: string,
    password: string,
  ): Promise<AdminAuth> {
    return this.authService.validateAdmin(email, password, req.ip);
  }
}
