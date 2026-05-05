import express from 'express';
import { getLatestBatch, getNearestBatch } from '../../utils/mongodb.js';
import { cacheResult, fetchFromCache } from '../../utils/redis.js';
import { BatchType } from '../../models/Enum.js';
import { ObjectType } from '../../models/Enum.js';
import { LiftStatus } from '../../models/Enum.js';

const router = express.Router();

// TODO: The routes in this file are not in the correct order.
// All endpoints below are mounted at /api/lifts.
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
// MISSING RESOURCES: if a requested lift or field does not exist,
// return HTTP 404 with a JSON error body. Do not return 200 with empty data.
//
// ⚠ ROUTE ORDER WARNING ⚠
// The routes below are NOT in the correct order. Express matches routes in
// the order they are declared. As written, one of these endpoints will never
// be reached — its requests will be matched (and handled incorrectly) by an
// earlier route. Test each endpoint before assuming it works, and reorder
// the route definitions in this file so every endpoint is reachable.

// GET /api/lifts — latest batch
router.get('/', async (req, res) => {
  try {
    // TODO: fetch the latest LiftBatch.
    // Look up cache → on miss, query MongoDB → write the result back to cache → return.

    const cachedBatch = await fetchFromCache(ObjectType.lift);

    if (cachedBatch) {
      console.log("Data found in cache");
      return res.json(cachedBatch);
    } else {
      console.log("Data not found in cache");
      console.log("Fetching data from MongoDB");
    
      const latestBatch = await getLatestBatch(BatchType.LiftBatch);      
      if (!latestBatch) {
        return res.status(404).json({ error: "No lift batch found" });
      } 
      await cacheResult(ObjectType.lift, latestBatch);
      // console.log("Writing data to cache");
      return res.json(latestBatch);
    }

    // console.log("This endpoint is not yet implemented");
    // res.status(501).json({ error: "Not implemented" });
  } catch (error) {
    console.error("Error in GET /api/lifts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/lifts/:name — specific lift
router.get('/:name', async (req, res) => {
  try {
    // TODO: return the named lift from the latest batch.
    // Look up cache → on miss, query MongoDB → write the result back to cache → return.
    // If the lift does not exist, return 404 with { error: "Lift not found" }.

    const cachedBatch = await fetchFromCache(ObjectType.lift);

    if (cachedBatch) {
      // console.log("Data found in cache");
      const lift = cachedBatch.lifts.find(l => l.name === req.params.name);
      if (!lift) {
        return res.status(404).json({ error: "Lift not found" });
      }
      return res.json(lift);

    } 
    else {
      // console.log("Data not found in cache");
      // console.log("Fetching data from MongoDB");

      const latestBatch = await getLatestBatch(BatchType.LiftBatch);
      if (!latestBatch) {
        return res.status(404).json({ error: "No lift batch found" });
      }

      await cacheResult(ObjectType.lift, latestBatch);
      const lift = latestBatch.lifts.find(l => l.name === req.params.name);
      if (!lift) {
        return res.status(404).json({ error: "Lift not found" });
      }

      return res.json(lift);
    }


    // console.log("This endpoint is not yet implemented");
    // res.status(501).json({ error: "Not implemented" });
  } catch (error) {
    console.error("Error in GET /api/lifts/:name:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/lifts/at/:timestamp — historical batch (NOT CACHED)
router.get('/at/:timestamp', async (req, res) => {
  try {
    // TODO: return the most recent LiftBatch with timestamp <= :timestamp.
    // Validate the timestamp format (e.g. 2025-05-01T14:25:00). Return 400 if invalid.
    // If no batch exists at or before the given timestamp, return 404.
    // DO NOT cache this endpoint.
    // console.log("This endpoint is not yet implemented");
    // res.status(501).json({ error: "Not implemented" });

    const timestamp = req.params.timestamp;

    if (timestamp === undefined || isNaN(Date.parse(timestamp))) {
      return res.status(400).json({ error: "Invalid timestamp format" });
    }

    const nearestBatch = await getNearestBatch(BatchType.LiftBatch, timestamp);
    if (!nearestBatch) {
      return res.status(404).json({ error: "No lift batch found at or before the given timestamp" });
    }

    return res.json(nearestBatch);


  } catch (error) {
    console.error("Error in GET /api/lifts/at/:timestamp:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// GET /api/lifts/:name/:field — single field of a specific lift
router.get('/:name/:field', async (req, res) => {
  try {
    // TODO: return only the requested field of the named lift.
    // Look up cache → on miss, query MongoDB → write the result back to cache → return.
    // If the lift does not exist, return 404 with { error: "Lift not found" }.
    // If the field does not exist on the lift, return 404 with { error: "Field not found" }.

    const cachedBatch = await fetchFromCache(ObjectType.lift);

    if (cachedBatch) {

      const lift = cachedBatch.lifts.find(l => l.name === req.params.name);

      if (!lift) {
        return res.status(404).json({ error: "Lift not found" });
      }

      const fieldValue = lift[req.params.field];
      
      if (fieldValue === undefined) {
        return res.status(404).json({ error: "Field not found" });
      }
      return res.json({ name: lift.name, [req.params.field]: fieldValue });

    }

    else {
      const latestBatch = await getLatestBatch(BatchType.LiftBatch);
      if (!latestBatch) {
        return res.status(404).json({ error: "No lift batch found" });
      }

      await cacheResult(ObjectType.lift, latestBatch);
      const lift = latestBatch.lifts.find(l => l.name === req.params.name);

      if (!lift) {
        return res.status(404).json({ error: "Lift not found" });
      }

      const fieldValue = lift[req.params.field];
      if (fieldValue === undefined) {
        return res.status(404).json({ error: "Field not found" });
      }

      return res.json({ name: lift.name, [req.params.field]: fieldValue });
    }


    // console.log("This endpoint is not yet implemented");
    // res.status(501).json({ error: "Not implemented" });
  } catch (error) {
    console.error("Error in GET /api/lifts/:name/:field:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/*
 * TODO: Implement an endpoint to update the status of a specific lift.
 *
 * The webpage's status form will call this endpoint. The handler should:
 *   - validate the incoming status against the LiftStatus enum.
 *     Return HTTP 400 with a JSON error body if the status is not a valid value.
 *   - return 404 if the named lift does not exist
 *   - update the lift's status (and its lastUpdated timestamp) in the cache
 *   - return the updated lift, or a success/failure indication
 *
 * You must choose the correct HTTP method for this operation. Consider:
 *   - Are you replacing the whole resource, or modifying part of it?
 *   - Is the operation idempotent?
 *   - What does REST convention suggest for partial updates?
 *
 * The route path should clearly identify both the resource and what's being changed.
 */

router.patch('/:name/status', async (req, res) => {

  // I'm just updating/modifying the resource because of the UPDATE/STATUS in the endpoint 
  // So I think PATCH is the most correct HTTP method to use here. 
  // PUT would be more appropriate if we were replacing the entire lift resource, 
  // but since we're only updating the status (and lastUpdated), PATCH is the more ok for this partial update.

  try {
    const { status } = req.body;
    const liftName = req.params.name;

    if (!Object.values(LiftStatus).includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const cachedBatch = await fetchFromCache(ObjectType.lift);

    if (cachedBatch) {
      const lift = cachedBatch.lifts.find(l => l.name === liftName);

      if (!lift) {
        return res.status(404).json({ error: "Lift not found" });
      }

      lift.status = status;
      lift.lastUpdated = new Date().toISOString();
      await cacheResult(ObjectType.lift, cachedBatch);
      return res.json(lift);
      
    } else {
      const latestBatch = await getLatestBatch(BatchType.LiftBatch);
      if (!latestBatch) {
        return res.status(404).json({ error: "No lift batch found" });
      }

      const lift = latestBatch.lifts.find(l => l.name === liftName);
      if (!lift) {
        return res.status(404).json({ error: "Lift not found" });
      }

      lift.status = status;
      lift.lastUpdated = new Date().toISOString();
      await cacheResult(ObjectType.lift, latestBatch);
      return res.json(lift);
    }

  }
  catch (error) {
    console.error("Error in PATCH /api/lifts/:name/status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
