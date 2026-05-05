// Rate-limit middlewares for the public API surface.
// Both back their counters with Redis (rate-limit-redis), so limits are
// shared across processes and survive restarts.
//
// Two limiters are exported:
//   - tokenIssueLimiter: TOKEN_RATE_LIMIT_PER_MINUTE / minute, keyed by client IP.
//                         Applied to POST /api/auth/token.
//                         Why IP: there's no token yet at this point.
//   - apiLimiter:        API_RATE_LIMIT_PER_MINUTE / minute, keyed by bearer token.
//                         Applied to /api/lifts and /api/trails AFTER bearerAuth
//                         runs (so req.token is populated).
//                         Why token: multiple students behind one campus NAT
//                         shouldn't share a quota.

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../utils/dbconfig.js';

// Limits configurable via .env. We grade against the defaults below.
const TOKEN_RATE_LIMIT = parseInt(process.env.TOKEN_RATE_LIMIT_PER_MINUTE || '10', 10);
const API_RATE_LIMIT   = parseInt(process.env.API_RATE_LIMIT_PER_MINUTE   || '5',  10);

// Shared 429 response handler.
//
// TODO: Implement me!
// The 429 response MUST include:
//   - A Retry-After header (in seconds) so the client knows when to retry.
//     express-rate-limit exposes req.rateLimit.resetTime as a Date.
//   - A JSON body of the form:
//       {
//         error:      "rate_limit_exceeded",
//         limit:      <requests per minute this endpoint allows>,
//         retryAfter: <seconds until the window resets>
//       }
//
// The webpage uses `limit` and `retryAfter` to show a user-facing message
// like "Rate limit (X req/min) exceeded — retry in Y seconds." A generic
// 429 with no body is not acceptable.
function rateLimitHandler(req, res, next, options) {

  const retryAfterSeconds = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
  res.set('Retry-After', retryAfterSeconds.toString());
  res.status(429).json({
    error: "rate_limit_exceeded",
    limit: options.max,
    retryAfter: retryAfterSeconds,
  });


  // console.log("rate-limit handler not yet implemented");
  // res.status(501).json({ error: "Rate limit handler not implemented" });
}

// Shared Redis store factory. Same Redis client as the data cache.
function makeStore() {
  return new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  });
}

export const tokenIssueLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute
  max: TOKEN_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  // TODO: Implement me!
  // - keyGenerator: function returning the client IP (req.ip).
  keyGenerator: (req) => req.ip,
  // - store: makeStore()
  store: makeStore(),
  // - handler: rateLimitHandler
  handler: rateLimitHandler
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute
  max: API_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  // TODO: Implement me!
  // - keyGenerator: function returning req.token (populated by bearerAuth).
  //   Fall back to req.ip if req.token is missing — defensive default,
  //   not the real path.
  keyGenerator: (req) => req.token || req.ip,
  // - store: makeStore()
  store: makeStore(),
  // - handler: rateLimitHandler
  handler: rateLimitHandler,
});
