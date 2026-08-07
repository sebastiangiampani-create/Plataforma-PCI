import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorResponse } from '@pci/domain';

interface StructuredExceptionBody {
  code?: string;
  message?: string;
  details?: string[];
}

const DEFAULT_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
};

/** Traduce cualquier excepción a la forma consistente de ApiErrorResponse (@pci/domain). */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let code = DEFAULT_CODES[status] ?? 'ERROR';
    let message = 'Ocurrió un error inesperado.';
    let details: string[] | undefined;

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const structured = body as StructuredExceptionBody;
        message = structured.message ?? exception.message;
        if (structured.code) code = structured.code;
        if (structured.details) details = structured.details;
      }
    } else if (exception instanceof Error) {
      // No se exponen detalles internos de errores no controlados al cliente.
      console.error('Excepción no controlada:', exception);
    }

    const payload: ApiErrorResponse = { error: { code, message, ...(details ? { details } : {}) } };
    response.status(status).json(payload);
  }
}
