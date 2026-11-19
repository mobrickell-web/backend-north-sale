import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

interface ErrorBody {
  message?: string | string[];
  code?: string;
  duplicates?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = "Internal server error";
    let code: string | undefined;
    let duplicates: unknown;

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object" && res !== null) {
        const body = res as ErrorBody;
        if (body.message) message = body.message;
        if (typeof body.code === "string") code = body.code;
        if (body.duplicates !== undefined) duplicates = body.duplicates;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.stack ?? exception.message, exception.name);
    }

    response.status(status).json({
      status: false,
      message,
      statusCode: status,
      ...(code ? { code } : {}),
      ...(duplicates !== undefined ? { duplicates } : {}),
      path: request.url,
      method: request.method,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id ?? "unknown",
      },
    });
  }
}
