/**
 * src/types/express.d.ts — Global Express Type Augmentation
 *
 * Single source of truth for all Express Request extensions.
 * Placing augmentations here (not in feature modules) means they are
 * available everywhere without circular imports.
 *
 * TypeScript picks this up automatically via tsconfig `include: ["src"]`.
 */

import type { JwtPayload } from '../modules/auth/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      /** Verified JWT payload — set by authenticate middleware. */
      user?: JwtPayload;
      /** Unique request correlation ID — set by requestId middleware. */
      requestId: string;
    }
  }
}
