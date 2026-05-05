import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import liftRoutes from './rest/routes/lift.js';
import trailRoutes from './rest/routes/trail.js';
import { initializeDatabases } from './utils/dbconfig.js';
import cors from 'cors';

// Auth (uncomment once you implement Task 6A)
import authIssueRouter from './auth/issue.js';
import { bearerAuth } from './auth/bearer.js';

// Rate limiting — MUST be dynamically imported AFTER initializeDatabases()
// connects to Redis, because RedisStore calls sendCommand at construction time.
// Uncomment the dynamic import below (after initializeDatabases) for Task 6B.

// DO NOT add a static import here; it will crash with ClientClosedError.

// tRPC
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './trpc/index.js';

// Express setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 1919;

// Connect to databases
const { mongoConnected, redisConnected } = await initializeDatabases();
if (!redisConnected) {
  console.error('Redis must be running. Start it with: sudo systemctl start redis');
  process.exit(1);
}
if (!mongoConnected) {
  console.error('Could not connect to MongoDB. Check your .env settings.');
  process.exit(1);
}

// Rate limiting (uncomment once you implement Task 6B).
// This MUST stay below initializeDatabases() — RedisStore needs a live connection.
const { tokenIssueLimiter, apiLimiter } = await import('./auth/limits.js');

// Apply all middleware
app.use(express.json());
app.use(cors());

// REST

// Auth issue endpoint — uncomment in Task 6A.
// Note: this MUST be mounted before bearerAuth, since the token endpoint
// itself does not require a token. In Task 6B, also apply tokenIssueLimiter
// as the first middleware.
app.use('/api/auth', tokenIssueLimiter, authIssueRouter);

// Apply bearerAuth to protected endpoints — uncomment the middleware in Task 6A.
// In Task 6B, also apply apiLimiter AFTER bearerAuth so that req.token is
// populated before the limiter reads it.
// Without bearerAuth, lifts and trails are publicly accessible.
app.use('/api/lifts', bearerAuth, apiLimiter, liftRoutes);
app.use('/api/trails',bearerAuth, apiLimiter, trailRoutes);

// tRPC middleware - mounted at /trpc path
app.use('/trpc', createExpressMiddleware({
  router: appRouter,
}));

// Serve static files only if no API route matched
const projectRoot = path.join(__dirname);
app.use(express.static(path.join(projectRoot, 'public')));

// Specific route for root path to ensure index.html is served
app.get('/', (_, res) => {
  res.sendFile(path.join(projectRoot, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Mammoth REST API running on http://localhost:${PORT}`);
  // console.log(`tRPC endpoint available at http://localhost:${PORT}/trpc`);
});
