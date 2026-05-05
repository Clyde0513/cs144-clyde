// NOTHING TO DO HERE EXCEPT CHANGE THE VALUES IN .env

import mongoose from 'mongoose';
import { createClient } from 'redis';

// ---------------------------------------------------------------------------
// Configuration from environment (.env). See .env.example for documentation.
// ---------------------------------------------------------------------------

// Defaults to false so the project works without a database the moment
// students clone it.
export const USE_DB = (process.env.USE_DB ?? 'false').toLowerCase() === 'true';

// Only relevant when USE_DB=true.
export const DEBUG = (process.env.DEBUG ?? 'true').toLowerCase() === 'true';

// ---------------------------------------------------------------------------
// MongoDB
// ---------------------------------------------------------------------------

export const DB_NAME = 'mammoth';
export const COLLECTION = 'status';

const MONGO_USER = process.env.MONGO_USER || '';
const MONGO_PASS = process.env.MONGO_PASS || '';

const localUri = `mongodb://localhost:27017/${DB_NAME}`;
const credentials = MONGO_USER && MONGO_PASS ? `${MONGO_USER}:${MONGO_PASS}@` : '';
const prodUri = `mongodb://${credentials}cs144.org:27017/${DB_NAME}`;

export const mongoUri = DEBUG ? localUri : prodUri;

// ---------------------------------------------------------------------------
// Redis
// ---------------------------------------------------------------------------

export const REDIS_PREFIX = 'mammoth:';
export const redisOptions = {
  socket: {
    host: '127.0.0.1',
    port: 6379,
  },
};

export const redisClient = createClient(redisOptions);

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

export const connectToMongoDB = async () => {
  try {
    await mongoose.connect(mongoUri, { maxPoolSize: 1 });
    const safeUri = mongoUri.replace(/\/\/[^@]+@/, '//***:***@');
    console.log(`Connected to MongoDB at ${safeUri}`);
    return true;
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    return false;
  }
};

export const connectToRedis = async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');
    // Clear Redis on every server start. The cache, auth tokens, and rate
    // limit counters all live in Redis; flushing on start gives every
    // restart a clean slate (no stale tokens, no carried-over rate limits,
    // no stale cache from a previous run with different fixtures or DEBUG).
    await redisClient.flushDb();
    console.log('Flushed Redis');
    return true;
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
    return false;
  }
};

export const initializeDatabases = async () => {
  const redisConnected = await connectToRedis();

  if (!USE_DB) {
    console.log("USE_DB=false — using fixtures, skipping MongoDB connection");
    return { mongoConnected: true, redisConnected };
  }

  const mongoConnected = await connectToMongoDB();
  return { mongoConnected, redisConnected };
};
