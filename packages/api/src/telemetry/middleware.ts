import type { NextFunction, Response } from 'express';
import type { ServerRequest } from '~/types';

export function telemetryMiddleware(req: ServerRequest, res: Response, next: NextFunction): void {
  next();
}

export function telemetryErrorMiddleware(
  err: unknown,
  _req: ServerRequest,
  _res: Response,
  next: NextFunction,
): void {
  next(err);
}
