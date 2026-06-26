// apps/backend/src/middleware/asyncHandler.ts
import type { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wrap an async handler so thrown errors flow to the express error handler. */
export const asyncHandler = (fn: AsyncHandler): RequestHandler =>
  (req, res, next) => { fn(req, res, next).catch(next); };
