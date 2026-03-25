import { Request, Response, NextFunction } from "express";

// Extend express-session types
declare module "express-session" {
  interface SessionData {
    userId?: string;
    userRole?: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!roles.includes(req.session.userRole ?? "")) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
