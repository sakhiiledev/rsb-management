import { TRPCError } from "@trpc/server";
import { logger } from "./logger";

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function handleServiceError(error: unknown): never {
  if (error instanceof AppError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
    });
  }

  if (error instanceof TRPCError) {
    throw error;
  }

  // Log unexpected errors but never expose them
  logger.error({ err: error }, "Unexpected service error");
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred. Please try again.",
  });
}
