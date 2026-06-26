// apps/backend/src/middleware/validate.ts
import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export const validateBody =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    req.body = parsed.data;
    next();
  };

export const validateQuery =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    // Express 4 typings: req.query is read/write — assign back.
    (req as unknown as { query: T }).query = parsed.data;
    next();
  };
