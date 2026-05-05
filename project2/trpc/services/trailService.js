import { BatchType } from '../../models/Enum.js';
import { getLatestBatch } from '../../utils/mongodb.js';
import { fetchFromCache, cacheResult } from '../../utils/redis.js';
export const TrailService = {
    // TODO: Implement a method that returns the latest trail array.
    // This should fetch the latest TrailBatch and return its `trails` field,
    // or [] if no batch exists.
    async getLatestTrails() {
        const LatestTrailBatch = await getLatestBatch(BatchType.TrailBatch);
        if (!LatestTrailBatch) {
            console.log("No trail batch found");
            return [];
        }
        return LatestTrailBatch.trails;
        // console.log("getLatestTrails service method not yet implemented");
        // return [];
    },
    // TODO: Implement a method that returns a single trail by name.
    // Search the latest batch for a matching name. Return null if not found.
    async getTrailByName(name) {
        const LatestTrailBatchByName = await getLatestBatch(BatchType.TrailBatch);
        if (!LatestTrailBatchByName) {
            console.log("No trail batch found");
            return null;
        }
        const trail = LatestTrailBatchByName.trails.find((trail) => trail.name === name);
        if (!trail) {
            console.log(`Trail "${name}" not found in latest batch`);
            return null;
        }
        return trail;
        // console.log("getTrailByName service method not yet implemented");
        // return null;
    },
    // TODO: Implement a method that updates a trail's status in the cache.
    //
    // The pattern is read–mutate–write against the cached batch:
    //   1. fetchFromCache for the trail batch
    //   2. find the matching trail (return failure if missing)
    //   3. update its status
    //   4. cacheResult to write the batch back
    async updateTrailStatus(name, status) {
        let cachedBatch = await fetchFromCache(BatchType.TrailBatch);
        if (!cachedBatch) {
            const mongooBatch = await getLatestBatch(BatchType.TrailBatch);
            if (!mongooBatch) {
                return { success: false, message: "No trail batch in cache" };
            }
            await cacheResult(BatchType.TrailBatch, mongooBatch);
            cachedBatch = mongooBatch;
        }
        const trailIndex = cachedBatch.trails.findIndex((trail) => trail.name === name);
        if (trailIndex === -1) {
            return { success: false, message: `Trail "${name}" not found in cache` };
        }
        cachedBatch.trails[trailIndex].status = status;
        await cacheResult(BatchType.TrailBatch, cachedBatch);
        return { success: true, message: `Trail "${name}" status updated to "${status}"` };
        // console.log("updateTrailStatus service method not yet implemented");
        // return { success: false, message: "Not implemented" };
    }
};
