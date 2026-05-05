// USE THIS CLIENT TO TEST YOUR TRPC ENDPOINTS
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
async function main() {
    const client = createTRPCProxyClient({
        links: [
            httpBatchLink({
                url: 'http://localhost:1919/trpc',
            }),
        ],
    });
    // Reads
    const allLifts = await client.lift.getLatest.query();
    const allTrails = await client.trail.getLatest.query();
    const lift = await client.lift.getByName.query({ name: 'Broadway Express 1' });
    const trail = await client.trail.getByName.query({ name: 'Wazoo' });
    console.log('Lifts (latest):', allLifts);
    console.log('Trails (latest):', allTrails);
    console.log('Lift by name:', lift);
    console.log('Trail by name:', trail);
    // Writes — each returns { success, message }
    const liftUpdate = await client.lift.updateStatus.mutate({
        name: 'Broadway Express 1',
        status: 'OPEN',
    });
    const trailUpdate = await client.trail.updateStatus.mutate({
        name: 'Wazoo',
        status: 'OPEN',
    });
    console.log('Lift update result:', liftUpdate);
    console.log('Trail update result:', trailUpdate);
    // Zod rejection check — the next call should be rejected by Zod before
    // the resolver runs, because 'NOT_A_REAL_STATUS' is not in LiftStatus.
    try {
        await client.lift.updateStatus.mutate({
            name: 'Broadway Express 1',
            status: 'NOT_A_REAL_STATUS',
        });
        console.error('FAIL: bad status should have been rejected by Zod');
    }
    catch (err) {
        console.log('OK: Zod rejected an invalid status');
    }
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
