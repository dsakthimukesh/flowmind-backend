import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { requestIdMiddleware }  from './middleware/request-id.middleware.js';
import { loggerMiddleware }     from './middleware/logger.middleware.js';
import { errorMiddleware }      from './middleware/error.middleware.js';
import { authRateLimiter, apiRateLimiter } from './middleware/rate-limit.middleware.js';

import { healthRouter }         from './modules/health/health.routes.js';
import { authRouter }           from './modules/auth/auth.routes.js';
import { organizationRouter }   from './modules/organizations/organization.routes.js';
import { jobsRouter }           from './modules/jobs/jobs.routes.js';
import { workflowRouter }       from './modules/workflows/workflow.routes.js';
import { executionRouter, metricsRouter } from './modules/executions/execution.routes.js';
import { knowledgeBaseRouter }  from './modules/knowledge-bases/knowledge-base.routes.js';
import { apiKeyRouter }         from './modules/api-keys/api-key.routes.js';
import { invitationRouter }     from './modules/invitations/invitation.routes.js';
import { auditLogRouter }       from './modules/audit-logs/audit-log.routes.js';

import { NotFoundError }        from './common/errors/index.js';
import { env }                  from './config/env.js';

export function createApp(): express.Application {
  const app = express();

  app.set('trust proxy', 1);

  // ── Infrastructure middleware ─────────────────────────────────────────────
  app.use(requestIdMiddleware);
  app.use(loggerMiddleware);
  app.use(helmet());
  app.use(compression());

  // ── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins =
    env.NODE_ENV === 'production'
      ? [process.env['FRONTEND_URL'] ?? 'https://app.flowmind.ai']
      : ['http://localhost:3000', 'http://localhost:5173'];

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) cb(null, true);
      else cb(new Error(`CORS: origin "${origin}" not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // ── Routes ────────────────────────────────────────────────────────────────

  // Health probes — no auth, no rate limit
  app.use('/health', healthRouter);

  // Auth — tight rate limit
  app.use('/api/v1/auth', authRateLimiter, authRouter);

  // All other API routes — general rate limit
  app.use('/api/v1', apiRateLimiter);
  app.use('/api/v1/organizations',  organizationRouter);
  app.use('/api/v1/jobs',           jobsRouter);
  app.use('/api/v1/workflows',      workflowRouter);
  app.use('/api/v1/executions',     executionRouter);
  app.use('/api/v1/metrics',        metricsRouter);
  app.use('/api/v1/knowledge-bases', knowledgeBaseRouter);
  app.use('/api/v1/api-keys',       apiKeyRouter);
  app.use('/api/v1/invitations',    invitationRouter);
  app.use('/api/v1/audit-logs',     auditLogRouter);

  // 404
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError('Route'));
  });

  // Global error handler — MUST be last
  app.use(errorMiddleware);

  return app;
}
