import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export function asyncHandler<TReq extends Request = Request>(
  handler: (req: TReq, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: TReq, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(422).json({
      message: "Validation failed",
      errors: error.flatten()
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.status).json({ message: error.message, details: error.details });
  }

  console.error(error);
  return res.status(500).json({ message: "Internal server error" });
}
