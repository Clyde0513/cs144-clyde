import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { t } from '../config.js';
import { LiftService } from '../services/liftService.js';
import { LiftStatus } from '../../models/Enum.js';
import { Lift } from '../../models/Lift.js';

const router = t.router;
const publicProcedure = t.procedure;

// Status validator: rejects any value not in the LiftStatus enum.
const liftStatusValidator = z.nativeEnum(LiftStatus);

// Name validator: non-empty, length-bounded. Real lift names contain spaces,
// digits, and punctuation, so we don't restrict character set here.
const liftNameSchema = z.string().min(1).max(100);

export const liftRouter = router({
  // TODO: Implement a procedure that returns the latest lift batch.
  // Should return all lifts in the current batch, or [] if none exists.
  getLatest: publicProcedure.query(async () => {
    // Student implementation here
    // LiftService.getLatestLifts().then((lifts) => {
    //   console.log("Latest lifts:", lifts);
    // }).catch((error) => {
    //   console.error("Error fetching latest lifts:", error);
    // });

    const latestLift = await LiftService.getLatestLifts();
    if (!latestLift) {
      console.log("No lifts found");
    } else {
      []; // or console.log("Latest lifts:", latestLift);
    }

    
    // console.log("getLatest procedure not yet implemented");
    // return [];
    return latestLift;
  }),

  // TODO: Implement a procedure that returns a single lift by name.
  // The input is validated by Zod; tighten the schema below if you wish.
  // Return the matching lift, or throw a tRPC NOT_FOUND error if it doesn't exist.
  getByName: publicProcedure
    .input(z.object({ name: liftNameSchema }))
    .query(async ({ input }) => {

      // we fetch the lift by name using the service method
      const lift = await LiftService.getLiftByName(input.name);
      if (!lift) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Lift "${input.name}" not found` });
      }
      return lift;

      // TODO: Implement me!
      // console.log("getByName procedure not yet implemented");
      
    }),

  // TODO: Implement a procedure that updates a lift's status in Redis.
  // Zod will reject any status that isn't a valid LiftStatus value before
  // your resolver runs. Inside the resolver:
  //   1. read the cached batch
  //   2. find the named lift; if missing, throw a tRPC NOT_FOUND error
  //   3. update its status (and lastUpdated)
  //   4. write the batch back to the cache
  //   5. return { success: true, message: '...' }
  updateStatus: publicProcedure
    .input(z.object({
      name:   liftNameSchema,
      status: liftStatusValidator,
    }))
    .mutation(async ({ input }) => {
      // TODO: Implement me!
      const res = await LiftService.updateLiftStatus(input.name, input.status);
      if (!res.success) {
        throw new TRPCError({ code: 'NOT_FOUND', message: res.message });
      }


      return { success: true, message: `Lift "${input.name}" status updated to "${input.status}"` };
      

      // console.log("updateStatus procedure not yet implemented");
      // return { success: false, message: "Not implemented" };
    }),
});
