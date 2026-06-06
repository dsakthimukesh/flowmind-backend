/**
 * src/common/utils/async-handler.ts — Async Route Handler Wrapper
 *
 * WHY THIS EXISTS:
 * Express 4 does not catch Promise rejections from async route handlers.
 * Without this wrapper, an unhandled rejection in an async controller
 * silently crashes the request — no 500 response, no error middleware
 * invocation, just a hanging connection (or an unhandled rejection warning).
 *
 * Express 5 (which we're using) does handle async errors natively, BUT
 * only for route handlers — not for middleware. We keep this wrapper for
 * two reasons:
 *   1. Explicit is better than relying on framework internals
 *   2. It works identically on Express 4 and 5, future-proofing the codebase
 *   3. It keeps controller code clean — no try/catch boilerplate
 *
 * Usage:
 *   router.get('/users/:id', asyncHandler(async (req, res) => {
 *     const user = await userService.findById(req.params.id);
 *     // No try/catch needed — errors go directly to error middleware
 *     res.json(successResponse('User fetched', user));
 *   }));
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

/**
 * Wraps an async Express handler and forwards any thrown errors
 * to Express's next() error pipeline.
 */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
