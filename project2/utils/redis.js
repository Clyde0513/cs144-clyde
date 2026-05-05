import { createClient } from 'redis';
import { REDIS_PREFIX, redisOptions } from './dbconfig.js';

// ---------------------------------------------------------------------------
// CACHE DESIGN
//
// We cache one JSON blob per resource type. The keys are:
//
//     mammoth:lift:all     → the latest LiftBatch as a JSON string
//     mammoth:trail:all    → the latest TrailBatch as a JSON string
//
// A "blob" here is the full batch object (timestamp + array of items),
// serialized with JSON.stringify on write and JSON.parse on read.
//
// Per-item lookups (e.g. GET /api/lifts/:name) still go through this same
// blob: read the cached batch, find the matching item, return it. There is
// NO separate cache key per item, and we do NOT use Redis hashes.
//
// Updates follow the same pattern:
//   1. Read the cached blob.
//   2. Mutate the matching item (status, lastUpdated, etc.) in JavaScript.
//   3. Write the updated blob back with cacheResult.
// ---------------------------------------------------------------------------

let redisClient = null;

async function getRedisClient() {
  if (!redisClient) {
    console.log('Creating new Redis client');
    redisClient = createClient(redisOptions);

    redisClient.on('error', err => {
      console.error('Redis Client Error:', err);
      redisClient = null;
    });

    await redisClient.connect();
    console.log('Connected to Redis successfully');
  }
  return redisClient;
}

/**
 * Fetch the cached blob for a resource type.
 *
 * On hit, parse the stored JSON and return it.
 * On miss, return null. The caller is responsible for querying MongoDB
 * and then calling cacheResult to repopulate the cache.
 *
 * @param {string} type - 'lift' or 'trail'
 * @returns {Promise<Object|null>} the parsed batch object, or null on miss
 */
export async function fetchFromCache(type) {
  const key = `${REDIS_PREFIX}${type}:all`;
  

  try {
    const client = await getRedisClient();
    console.log("Attempting to fetch data from cache");

    // TODO: Implement me!
    // 1. Read the value at `key` from Redis.
    const value = await client.get(key);
    // 2. If the key is missing, log "Data not found in cache" and return null.
    if (!value) {
      console.log("Data not found in cache");
      return null;
    }
    // 3. If the key is present, log "Data found in cache", parse the JSON,
    //    and return the object.
    console.log("Data found in cache");
    return JSON.parse(value);

    // console.log("fetchFromCache function not yet implemented");
    // return null;
  } catch (error) {
    console.error(`Error fetching from Redis:`, error);
    return null;
  }
}

/**
 * Write a blob to the cache for a resource type.
 *
 * The blob is JSON-stringified before storage, and the key expires after
 * `expiration` seconds. The default of 300 (5 minutes) matches the spec.
 *
 * @param {string} type - 'lift' or 'trail'
 * @param {Object} blob - the batch object to cache
 * @param {number} [expiration=300] - TTL in seconds
 * @returns {Promise<boolean>} true on success, false on failure
 */
export async function cacheResult(type, blob, expiration = 300) {
  const key = `${REDIS_PREFIX}${type}:all`;

  try {
    const client = await getRedisClient();

    // TODO: Implement me!
    // 1. JSON-stringify the blob.
    const jsonString = JSON.stringify(blob);
    // 2. SET it at `key` in Redis with an expiration of `expiration` seconds.
    // 3. Log "Writing data to cache" before the write.
    console.log("Writing data to cache");
    await client.set(key, jsonString, { EX: expiration });
    // 4. Return true on success.
    return true;

    
    // console.log("Writing data to cache");
    // await client.set(key, jsonString, options);
    // return true;
  } catch (error) {
    console.error(`Error caching result:`, error);
    return false;
  }
}
