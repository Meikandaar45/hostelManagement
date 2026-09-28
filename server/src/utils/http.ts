import type { Request } from 'express';

export function getPositiveIntParam(req: Request, name: string): number {
  const raw = req.params[name];

  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw Object.assign(new Error(`Invalid ${name} parameter`), { statusCode: 400 });
  }

  const value = Number(raw);

  if (!Number.isSafeInteger(value) || value < 1) {
    throw Object.assign(new Error(`Invalid ${name} parameter`), { statusCode: 400 });
  }

  return value;
}
