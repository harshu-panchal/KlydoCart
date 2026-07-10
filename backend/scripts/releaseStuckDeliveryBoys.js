/**
 * One-off maintenance script: free delivery boys that are stuck "busy" forever.
 *
 * A delivery boy is treated as "busy" whenever an order (status Processed/Shipped/
 * Out for Delivery/On the way) or a return (pickupStatus Assigned/Picked Up) is still
 * assigned to them. If they accepted but never delivered, that assignment lingers and the
 * boy can never take a new order. This script unassigns such stale/undelivered work and
 * puts the orders back in the pool, so the boys become available again on their next login.
 *
 * Runs with plain Node (no build/tsx needed):
 *
 *   cd ~/KlydoCart/backend
 *   node scripts/releaseStuckDeliveryBoys.js            # release assignments idle longer than DELIVERY_AUTO_RELEASE_MINUTES (default 45)
 *   node scripts/releaseStuckDeliveryBoys.js --minutes=45
 *   node scripts/releaseStuckDeliveryBoys.js --all      # release EVERY active assignment now (full reset)
 *   node scripts/releaseStuckDeliveryBoys.js --dry-run  # show what would change, write nothing
 *
 * Uses MONGODB_URI from backend/.env.
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ACTIVE_ORDER_STATUSES = ['Processed', 'Shipped', 'Out for Delivery', 'On the way'];
const ACTIVE_RETURN_PICKUP_STATUSES = ['Assigned', 'Picked Up'];

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { all: false, dryRun: false, minutes: undefined };
  for (const a of args) {
    if (a === '--all') opts.all = true;
    else if (a === '--dry-run' || a === '--dryrun') opts.dryRun = true;
    else if (a.startsWith('--minutes=')) opts.minutes = Number(a.split('=')[1]);
  }
  if (opts.minutes === undefined) {
    const envVal = Number(process.env.DELIVERY_AUTO_RELEASE_MINUTES);
    opts.minutes = Number.isFinite(envVal) && envVal > 0 ? envVal : 45;
  }
  if (opts.all) opts.minutes = 0; // 0 => ignore age, release everything
  return opts;
}

async function main() {
  const opts = parseArgs();
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in backend/.env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');
  console.log(
    opts.all
      ? '🔧 Mode: RELEASE ALL active assignments (full reset)'
      : `🔧 Mode: release assignments idle for more than ${opts.minutes} min`
  );
  if (opts.dryRun) console.log('🧪 DRY RUN - no changes will be written.\n');

  const db = mongoose.connection.db;
  const ordersColl = db.collection('orders');
  const returnsColl = db.collection('returns');

  const cutoff = opts.minutes > 0 ? new Date(Date.now() - opts.minutes * 60 * 1000) : new Date();

  // -------- Orders --------
  const candidateOrders = await ordersColl
    .find({ deliveryBoy: { $exists: true, $ne: null }, status: { $in: ACTIVE_ORDER_STATUSES } })
    .toArray();

  let releasedOrders = 0;
  const affectedBoys = new Set();

  for (const order of candidateOrders) {
    const anchor = order.updatedAt || order.assignedAt || order.createdAt;
    if (opts.minutes > 0 && anchor && new Date(anchor).getTime() > cutoff.getTime()) {
      continue; // not stale yet
    }
    const boyId = order.deliveryBoy ? order.deliveryBoy.toString() : 'unknown';
    affectedBoys.add(boyId);
    releasedOrders += 1;
    console.log(`  ♻️  Order ${order.orderNumber} (status ${order.status}) <- boy ${boyId}`);

    if (opts.dryRun) continue;

    const note =
      `[${new Date().toISOString()}] Auto-released from delivery boy ${boyId} (undelivered) via releaseStuckDeliveryBoys script. Returned to pool.`;
    await ordersColl.updateOne(
      { _id: order._id },
      {
        $set: {
          status: 'Accepted',
          sellerPickups: [],
          adminNotes: order.adminNotes ? order.adminNotes + '\n' + note : note,
          updatedAt: new Date(),
        },
        $unset: { deliveryBoy: '', deliveryBoyStatus: '', assignedAt: '' },
      }
    );
  }

  // -------- Returns --------
  const candidateReturns = await returnsColl
    .find({ deliveryBoy: { $exists: true, $ne: null }, pickupStatus: { $in: ACTIVE_RETURN_PICKUP_STATUSES } })
    .toArray();

  let releasedReturns = 0;
  for (const ret of candidateReturns) {
    const anchor = ret.updatedAt || ret.createdAt;
    if (opts.minutes > 0 && anchor && new Date(anchor).getTime() > cutoff.getTime()) {
      continue;
    }
    const boyId = ret.deliveryBoy ? ret.deliveryBoy.toString() : 'unknown';
    affectedBoys.add(boyId);
    releasedReturns += 1;
    console.log(`  ♻️  Return ${ret._id} (pickup ${ret.pickupStatus}) <- boy ${boyId}`);

    if (opts.dryRun) continue;

    const set = { pickupStatus: 'Pending', updatedAt: new Date() };
    if (ret.status === 'Processing') set.status = 'Approved';
    await returnsColl.updateOne({ _id: ret._id }, { $set: set, $unset: { deliveryBoy: '' } });
  }

  console.log('\n──────── Summary ────────');
  console.log(`Orders released:  ${releasedOrders}`);
  console.log(`Returns released: ${releasedReturns}`);
  console.log(`Delivery boys freed: ${affectedBoys.size}`);
  if (opts.dryRun) console.log('(dry run - nothing was written)');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('❌ Script failed:', err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
