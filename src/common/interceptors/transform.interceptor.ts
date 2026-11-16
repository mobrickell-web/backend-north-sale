import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request } from "express";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface ApiResponse<T> {
  status: boolean;
  data: T | null;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();

    // File downloads must stay raw, not JSON-enveloped.
    const path = request.originalUrl.split("?")[0];
    if (path.endsWith(".ics") || path.endsWith("/download")) {
      return next.handle() as unknown as Observable<ApiResponse<T>>;
    }

    return next.handle().pipe(
      map((data) => {
        return {
          status: true,
          data: data ?? null,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id ?? "unknown",
          },
        };
      }),
    );
  }
}
