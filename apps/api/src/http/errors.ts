import type { FastifyReply } from "fastify";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export function apiError(code: string, message: string, details?: unknown[]): ApiErrorBody {
  return {
    error: {
      code,
      message,
      ...(details?.length ? { details } : {}),
    },
  };
}

export function sendError(reply: FastifyReply, statusCode: number, code: string, message: string, details?: unknown[]) {
  return reply.code(statusCode).send(apiError(code, message, details));
}
