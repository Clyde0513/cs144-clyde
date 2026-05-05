import express from 'express';
import { randomBytes } from 'node:crypto';
import { redisClient } from '../utils/dbconfig.js';



const router = express.Router();

// Token TTL in seconds. Configurable via .env (default: 3600 = 1 hour).
const TOKEN_TTL_SECONDS = parseInt(process.env.TOKEN_TTL_SECONDS || '3600', 10);

// POST /api/auth/token — anonymous bearer token issuance.
// No auth required. Anyone who hits this gets a token.
router.post('/token', async (req, res) => {
  try {
    // TODO: Implement me!
    // 1. Generate a cryptographically random token (32 bytes, hex-encoded).
    //    DO NOT use Math.random — it is not cryptographically secure.
    //    Hint: node has a built-in module for this.
    const cryptoRandomToken = randomBytes(32).toString('hex');
    // 2. Store the token in Redis under `auth:token:<token>` with a TTL of
    //    TOKEN_TTL_SECONDS. The value can be a small JSON string containing
    //    { issuedAt, ip } for diagnostic purposes.
    const redisKeyToken = `auth:token:${cryptoRandomToken}`;
    const redisValueToken = JSON.stringify({
      issuedAt: Date.now(),
      ip: req.ip,
    });
    
    // 3. Respond with { token, expiresIn: TOKEN_TTL_SECONDS }.

    await redisClient.setEx(redisKeyToken, TOKEN_TTL_SECONDS, redisValueToken);

    res.json({ token: cryptoRandomToken, expiresIn: TOKEN_TTL_SECONDS });


    // console.log("POST /api/auth/token not yet implemented");
    // res.status(501).json({ error: "Not implemented" });
    
  } catch (error) {
    console.error("Error in POST /api/auth/token:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
