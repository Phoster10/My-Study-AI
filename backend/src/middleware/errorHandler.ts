import type { NextFunction, Request, Response } from "express";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error("[error]", err);
  const message = err instanceof Error ? err.message : "Unexpected server error.";
  res.status(500).json({ error: message });
}

/** Wraps an async route handler so thrown errors reach errorHandler instead
 * of crashing the process or hanging the request. */
export function asyncRoute(fn: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}
