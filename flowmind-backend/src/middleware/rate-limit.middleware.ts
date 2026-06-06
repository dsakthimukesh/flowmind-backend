import rateLimit from 'express-rate-limit';

/** Auth endpoints — 10 attempts per 15 min per IP. Slows brute-force attacks. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
});

/** General API — 100 requests per minute per IP. */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' },
});

/** Sensitive operations — 5 per hour per IP (invitation creation, API key creation). */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Request limit reached. Try again later.', code: 'RATE_LIMITED' },
});
