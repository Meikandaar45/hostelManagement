import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors from schema.parse() called inside controllers
  if (err instanceof ZodError) {
    const errors: Record<string, string> = {};
    for (const issue of err.errors) {
      const key = issue.path.join('.');
      errors[key] = issue.message;
    }
    res.status(400).json({ success: false, message: 'Validation failed', errors });
    return;
  }

  // Custom HTTP status codes
  if (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof (err as { statusCode: unknown }).statusCode === 'number'
  ) {
    const statusCode = (err as { statusCode: number }).statusCode;
    const message = err instanceof Error ? err.message : 'An error occurred';
    res.status(statusCode).json({ success: false, message });
    return;
  }

  // MySQL duplicate entry
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'ER_DUP_ENTRY'
  ) {
    res.status(409).json({ success: false, message: 'A record with that value already exists' });
    return;
  }

  // Log unexpected server errors (safe — no secrets logged)
  const message = err instanceof Error ? err.message : 'Unknown error';
  logger.error('Unhandled error', { message });

  res.status(500).json({ success: false, message: 'An unexpected error occurred' });
}
