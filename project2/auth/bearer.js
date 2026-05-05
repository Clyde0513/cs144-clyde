// Express middleware: verify a bearer token against Redis.
// Apply to any route group that should require a token (e.g. /api/lifts, /api/trails).
//
// Behavior:
//   - Reads the Authorization header.
//   - Rejects with 401 if missing or not in "Bearer <token>" form.
//   - Looks up auth:token:<token> in Redis.
//   - If the key is missing or expired, rejects with 401.
//   - Otherwise, attaches the token to req.token and calls next().

import { redisClient } from '../utils/dbconfig.js';

export async function bearerAuth(req, res, next) {
  try {
    // TODO: Implement me!
    // 1. Read req.headers['authorization'].
    const authHeader = req.headers['authorization'];
    // 2. If absent or doesn't start with "Bearer ", return 401 with
    //    { error: "Missing or malformed Authorization header" }.
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or malformed Authorization header" });
    }
    // 3. Extract the token (everything after "Bearer ").
    const token = authHeader.substring(7);
    // 4. GET auth:token:<token> from Redis. If missing, return 401 with
    //    { error: "Invalid or expired token" }.
    const redisKey = `auth:token:${token}`;
    const redisValue = await redisClient.get(redisKey);
    if (!redisValue) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    // 5. Attach req.token = token and call next().
    req.token = token;
    next();
  
    // console.log("bearerAuth middleware not yet implemented");
    // return res.status(501).json({ error: "Auth not implemented" });
  } catch (error) {
    console.error("Error in bearerAuth:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
