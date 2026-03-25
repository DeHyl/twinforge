import type { Request, Response } from "express";

export function requireAdmin(req: Request, res: Response, next: () => void) {
  const secret = (process.env.ADMIN_SECRET ?? "twinforge2026").trim();
  const raw = req.headers["x-admin-secret"] || req.query.secret;
  const provided = Array.isArray(raw) ? raw[0] : raw;
  if (provided !== secret) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  next();
}
