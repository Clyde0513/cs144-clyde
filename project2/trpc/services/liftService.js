import { getLatestBatch } from '../../utils/mongodb.js';
import { fetchFromCache, cacheResult } from '../../utils/redis.js';
import { BatchType } from '../../models/Enum.js';
import { getLocalTimestamp } from '../../utils/dates.js';
export const LiftService = {
    // TODO: Implement a method that returns the latest lift array.
    // This should fetch the latest LiftBatch and return its `lifts` field,
    // or [] if no batch exists.
    async getLatestLifts() {
        const LatestLiftBatch = await getLatestBatch(BatchType.LiftBatch);
        if (!LatestLiftBatch) {
            console.log("No lift batch found");
            return [];
        }
        return LatestLiftBatch.lifts;
        // console.log("getLatestLifts service method not yet implemented");
        // return [];
    },
    // TODO: Implement a method that returns a single lift by name.
    // Search the latest batch for a matching name. Return null if not found.
    async getLiftByName(name) {
        const LatestLiftBatchByName = await getLatestBatch(BatchType.LiftBatch);
        if (!LatestLiftBatchByName) {
            console.log("No lift batch found");
            return null;
        }
        const lift = LatestLiftBatchByName.lifts.find((lift) => lift.name === name);
        if (!lift) {
            console.log(`Lift "${name}" not found in latest batch`);
            return null;
        }
        return lift;
        // console.log("getLiftByName service method not yet implemented");
        // return null;
    },
    // TODO: Implement a method that updates a lift's status in the cache.
    //
    // The pattern is read–mutate–write against the cached batch:
    //   1. fetchFromCache for the lift batch
    //   2. find the matching lift (return failure if missing)
    //   3. update its status and lastUpdated timestamp
    //   4. cacheResult to write the batch back
    //
    // Hint: you'll need a helper to produce a current timestamp string.
    // Check utils/ for something useful — you may need to add an import.
    async updateLiftStatus(name, status) {
        let cachedBatch = await fetchFromCache(BatchType.LiftBatch);
        if (!cachedBatch) {
            const mongooBatch = await getLatestBatch(BatchType.LiftBatch);
            if (!mongooBatch) {
                return { success: false, message: "No lift batch in cache" };
            }
            await cacheResult(BatchType.LiftBatch, mongooBatch);
            cachedBatch = mongooBatch;
        }
        const liftIndex = cachedBatch.lifts.findIndex((lift) => lift.name === name);
        if (liftIndex === -1) { // -1 cuz findIndex returns -1 if not found
            return { success: false, message: `Lift "${name}" not found in cached batch` };
        }
        cachedBatch.lifts[liftIndex].status = status;
        cachedBatch.lifts[liftIndex].lastUpdated = getLocalTimestamp();
        await cacheResult(BatchType.LiftBatch, cachedBatch);
        return { success: true, message: `Lift "${name}" status updated to "${status}"` };
        // console.log("updateLiftStatus service method not yet implemented");
        // return { success: false, message: "Not implemented" };
    }
};
