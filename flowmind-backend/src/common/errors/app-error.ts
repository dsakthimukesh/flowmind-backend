/**
 * src/common/errors/app-error.ts — Base Application Error
 *
 * WHY A CUSTOM ERROR HIERARCHY:
 * JavaScript's built-in Error carries only a message and stack trace.
 * In a production API you need structured, semantic errors that carry:
 *
 *   • statusCode  — so the HTTP layer can respond correctly
 *   • isOperational — to distinguish bugs (programming errors) from
 *                     expected business errors (wrong password, not found).
 *                     Operational errors get logged as warnings and surfaced
 *                     to the client. Non-operational errors (bugs) are logged
 *                     as fatal and hidden from the client in production.
 *   • code        — machine-readable identifier for frontend i18n and
 *                   analytics (e.g. "VALIDATION_ERROR", "UNAUTHORIZED")
 *
 * WHY EXTEND Error NATIVELY:
 * Using `instanceof AppError` in the error middleware reliably identifies
 * our custom errors. This works correctly in TypeScript ESM with the
 * `Object.setPrototypeOf` fix below (required for extending built-ins
 * when targeting ES5/CommonJS transpilation edge cases).
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
  ) {
    super(message);

    // Restore prototype chain — required when extending built-in classes
    // in environments that transpile to ES5 or have prototype quirks.
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = new.target.name;   // "NotFoundError", "ValidationError", etc.
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    // Capture clean stack trace — excludes the constructor call itself
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }
}
