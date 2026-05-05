import express from 'express';
import { getLatestBatch, getNearestBatch } from '../../utils/mongodb.js';
import { cacheResult, fetchFromCache } from '../../utils/redis.js';
import { BatchType } from '../../models/Enum.js';
import { ObjectType } from '../../models/Enum.js';
import { TrailStatus } from '../../models/Enum.js';

const router = express.Router();

// TODO: The routes in this file are not in the correct order.
// All endpoints below are mounted at /api/trails.
//
// CACHING REQUIREMENTS (apply to every READ endpoint EXCEPT /at/:timestamp):
//   1. Check the cache first.
//      - On HIT: return the cached data. Do not query MongoDB.
//      - On MISS: query MongoDB, then WRITE THE RESULT BACK TO THE CACHE
//        before returning it. The next request must hit the cache.
//   2. Cache TTL is 5 minutes.
//   3. You MUST log these exact strings so the grader can verify your flow:
//        "Attempting to fetch data from cache"
//        "Data found in cache"      (on hit)
//        "Data not found in cache"  (on miss)
//        "Fetching data from MongoDB"
//        "Writing data to cache"
//
// MISSING RESOURCES: if a requested trail or field does not exist,
// return HTTP 404 with a JSON error body. Do not return 200 with empty data.
//
// ⚠ ROUTE ORDER WARNING ⚠
// The routes below are NOT in the correct order. Express matches routes in
// the order they are declared. As written, one of these endpoints will never
// be reached — its requests will be matched (and handled incorrectly) by an
// earlier route. Test each endpoint before assuming it works, and reorder
// the route definitions in this file so every endpoint is reachable.

// GET /api/trails — latest batch
router.get('/', async (req, res) => {
  try {
    // TODO: fetch the latest TrailBatch.
    // Look up cache → on miss, query MongoDB → write the result back to cache → return.

     const cachedBatch = await fetchFromCache(ObjectType.trail);

    if (cachedBatch) {
      console.log("Data found in cache");
      return res.json(cachedBatch);
    } else {
      console.log("Data not found in cache");
      console.log("Fetching data from MongoDB");
    
      const latestBatch = await getLatestBatch(BatchType.TrailBatch);      
      if (!latestBatch) {
        return res.status(404).json({ error: "No trail batch found" });
      } 
      await cacheResult(ObjectType.trail, latestBatch);
      // console.log("Writing data to cache");
      return res.json(latestBatch);
    }

    // console.log("This endpoint is not yet implemented");
    // res.status(501).json({ error: "Not implemented" });
  } catch (error) {
    console.error("Error in GET /api/trails:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/trails/:name — specific trail
router.get('/:name', async (req, res) => {
  try {
    // TODO: return the named trail from the latest batch.
    // Look up cache → on miss, query MongoDB → write the result back to cache → return.
    // If the trail does not exist, return 404 with { error: "Trail not found" }.

     const cachedBatch = await fetchFromCache(ObjectType.trail);

    if (cachedBatch) {
      // console.log("Data found in cache");
      const trail = cachedBatch.trails.find(t => t.name === req.params.name);
      if (!trail) {
        return res.status(404).json({ error: "Trail not found" });
      }
      return res.json(trail);

    } 
    else {
      // console.log("Data not found in cache");
      // console.log("Fetching data from MongoDB");

      const latestBatch = await getLatestBatch(BatchType.TrailBatch);
      if (!latestBatch) {
        return res.status(404).json({ error: "No trail batch found" });
      }

      await cacheResult(ObjectType.trail, latestBatch);
      const trail = latestBatch.trails.find(t => t.name === req.params.name);
      if (!trail) {
        return res.status(404).json({ error: "Trail not found" });
      }

      return res.json(trail);
    }

    // console.log("This endpoint is not yet implemented");
    // res.status(501).json({ error: "Not implemented" });
  } catch (error) {
    console.error("Error in GET /api/trails/:name:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/trails/at/:timestamp — historical batch (NOT CACHED)
// /at/:timestamp should be after /:name and before /:name/:field to avoid route conflicts
router.get('/at/:timestamp', async (req, res) => {
  try {
    // TODO: return the most recent TrailBatch with timestamp <= :timestamp.
    // Validate the timestamp format (e.g. 2025-05-01T14:25:00). Return 400 if invalid.
    // If no batch exists at or before the given timestamp, return 404.
    // DO NOT cache this endpoint.

    const timestamp = req.params.timestamp;

    if (timestamp === undefined || isNaN(Date.parse(timestamp))) {
      return res.status(400).json({ error: "Invalid timestamp format" });
    }

    const nearestBatch = await getNearestBatch(BatchType.TrailBatch, timestamp);
    if (!nearestBatch) {
      return res.status(404).json({ error: "No trail batch found at or before the given timestamp" });
    }

    return res.json(nearestBatch);

    // console.log("This endpoint is not yet implemented");
    // res.status(501).json({ error: "Not implemented" });
  } catch (error) {
    console.error("Error in GET /api/trails/at/:timestamp:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/trails/:name/:field — single field of a specific trail
router.get('/:name/:field', async (req, res) => {
  try {
    // TODO: return only the requested field of the named trail.
    // Look up cache → on miss, query MongoDB → write the result back to cache → return.
    // If the trail does not exist, return 404 with { error: "Trail not found" }.
    // If the field does not exist on the trail, return 404 with { error: "Field not found" }.

     const cachedBatch = await fetchFromCache(ObjectType.trail);

    if (cachedBatch) {

      const trail = cachedBatch.trails.find(t => t.name === req.params.name);

      if (!trail) {
        return res.status(404).json({ error: "Trail not found" });
      }

      const fieldValue = trail[req.params.field];
      
      if (fieldValue === undefined) {
        return res.status(404).json({ error: "Field not found" });
      }
      return res.json({ name: trail.name, [req.params.field]: fieldValue });

    }

    else {
      const latestBatch = await getLatestBatch(BatchType.TrailBatch);
      if (!latestBatch) {
        return res.status(404).json({ error: "No trail batch found" });
      }

      await cacheResult(ObjectType.trail, latestBatch);
      const trail = latestBatch.trails.find(t => t.name === req.params.name);

      if (!trail) {
        return res.status(404).json({ error: "Trail not found" });
      }

      const fieldValue = trail[req.params.field];
      if (fieldValue === undefined) {
        return res.status(404).json({ error: "Field not found" });
      }

      return res.json({ name: trail.name, [req.params.field]: fieldValue });
    }

    // console.log("This endpoint is not yet implemented");
    // res.status(501).json({ error: "Not implemented" });
  } catch (error) {
    console.error("Error in GET /api/trails/:name/:field:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



/*
 * TODO: Implement an endpoint to update the status of a specific trail.
 *
 * The webpage's status form will call this endpoint. The handler should:
 *   - validate the incoming status against the TrailStatus enum.
 *     Return HTTP 400 with a JSON error body if the status is not a valid value.
 *   - return 404 if the named trail does not exist
 *   - update the trail's status in the cache
 *   - return the updated trail, or a success/failure indication
 *
 * You must choose the correct HTTP method for this operation. Consider:
 *   - Are you replacing the whole resource, or modifying part of it?
 *   - Is the operation idempotent?
 *   - What does REST convention suggest for partial updates?
 *
 * The route path should clearly identify both the resource and what's being changed.
 */
router.patch('/:name/status', async (req, res) => {

  // I just basically copied the logic from the LiftBatch Status in lift.js into here since it's basically the same logic.
  // just for trails instead of lifts
  
  try {
    const { status } = req.body;
    const trailName = req.params.name;

    if (!Object.values(TrailStatus).includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const cachedBatch = await fetchFromCache(ObjectType.trail);

    if (cachedBatch) {
      const trail = cachedBatch.trails.find(t => t.name === trailName);

      if (!trail) {
        return res.status(404).json({ error: "Trail not found" });
      }

      trail.status = status;
      trail.lastUpdated = new Date().toISOString();
      await cacheResult(ObjectType.trail, cachedBatch);
      return res.json(trail);
      
    } else {
      const latestBatch = await getLatestBatch(BatchType.TrailBatch);
      if (!latestBatch) {
        return res.status(404).json({ error: "No trail batch found" });
      }

      const trail = latestBatch.trails.find(t => t.name === trailName);
      if (!trail) {
        return res.status(404).json({ error: "Trail not found" });
      }

      trail.status = status;
      trail.lastUpdated = new Date().toISOString();
      await cacheResult(ObjectType.trail, latestBatch);
      return res.json(trail);
    }

  }
  catch (error) {
    console.error("Error in PATCH /api/trails/:name/status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


export default router;
