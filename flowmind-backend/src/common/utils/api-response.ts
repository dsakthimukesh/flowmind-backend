/**
 * src/common/utils/api-response.ts — Standard API Response Helpers
 *
 * WHY STANDARDIZE RESPONSES:
 * Inconsistent API shapes are a maintenance burden for frontend teams and
 * API consumers. A consistent envelope format means:
 *   • Frontend can write a single response handler/interceptor
 *   • Error shapes are predictable — no guessing `error.message` vs `error.msg`
 *   • Adding fields (pagination, meta, trace IDs) is done in one place
 *
 * ENVELOPE SHAPE:
 *   Success: { success: true,  message: string, data: T,    meta?: object }
 *   Error:   { success: false, message: string, code: string, errors?: [] }
 *
 * These are pure data-shaping helpers — they don't call res.json() themselves.
 * Controllers own the status code decision; helpers own the shape.
 *
 * Usage in a controller:
 *   res.status(200).json(successResponse('Users fetched', users));
 *   res.status(400).json(errorResponse('Validation failed', 'VALIDATION_ERROR', details));
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ErrorResponse {
  success: false;
  message: string;
  code: string;
  errors?: Array<{ field: string; message: string }>;
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a standardized success response envelope.
 *
 * @param message  Human-readable success message
 * @param data     The response payload (typed)
 * @param meta     Optional metadata — pagination, counts, cursor, etc.
 */
export function successResponse<T = unknown>(
  message: string,
  data: T,
  meta?: Record<string, unknown>,
): SuccessResponse<T> {
  return {
    success: true,
    message,
    data,
    ...(meta !== undefined && { meta }),
  };
}

/**
 * Build a standardized error response envelope.
 *
 * @param message  Human-readable error message
 * @param code     Machine-readable error code (e.g. 'NOT_FOUND', 'VALIDATION_ERROR')
 * @param errors   Optional field-level validation error details
 */
export function errorResponse(
  message: string,
  code: string,
  errors?: Array<{ field: string; message: string }>,
): ErrorResponse {
  return {
    success: false,
    message,
    code,
    ...(errors !== undefined && errors.length > 0 && { errors }),
  };
}
