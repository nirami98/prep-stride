import type { RequestHandler } from "express";
import { getAuth } from "@clerk/express";

type Entry = { count: number; resetsAt: number };

export function createMutationRateLimit(max = 30, windowMs = 15 * 60_000): RequestHandler {
  const entries = new Map<string, Entry>();
  return (req: any, res, next) => {
    if (!["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) return next();
    const now = Date.now();
    const identity = getAuth(req).userId ?? req.ip ?? "unknown";
    const key = `${identity}:${req.baseUrl}`;
    let entry = entries.get(key);
    if (!entry || entry.resetsAt <= now) {
      entry = { count: 0, resetsAt: now + windowMs };
      entries.set(key, entry);
    }
    entry.count += 1;
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(entry.resetsAt / 1000)));
    if (entry.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((entry.resetsAt - now) / 1000)));
      return res.status(429).json({ error: "Too many requests. Please wait before trying again." });
    }
    next();
  };
}

export const aiMutationRateLimit = createMutationRateLimit();
