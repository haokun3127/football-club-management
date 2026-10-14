import { BackofficeFault } from "../persistence/backoffice-management-repository.js";
import type { FastifyError, FastifyInstance } from "fastify";
import { sendError } from "./errors.js";

export function registerBackofficeErrors(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error instanceof BackofficeFault)
      return sendError(
        reply,
        error.status,
        error.code,
        "Backoffice request rejected",
        error.details === undefined ? undefined : [error.details],
      );
    if (
      error.code?.startsWith("SQLITE_CONSTRAINT") ||
      (error.code === "ERR_SQLITE_ERROR" &&
        (error as FastifyError & { errcode?: number }).errcode === 19)
    )
      return sendError(
        reply,
        409,
        "record_constraint",
        "Record conflicts with existing data",
      );
    if (
      error.validation ||
      (error.statusCode && error.statusCode >= 400 && error.statusCode < 500)
    ) {
      return sendError(
        reply,
        error.statusCode ?? 400,
        "bad_request",
        "Invalid request",
      );
    }
    // Never include credential data, SQLite diagnostics or request bodies in a response.
    return sendError(
      reply,
      500,
      "internal_error",
      "Backoffice request could not be completed",
    );
  });
}
