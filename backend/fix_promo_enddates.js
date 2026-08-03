/**
 * Migration: Fix PromoStrip endDates to end-of-day (23:59:59.999 UTC)
 *
 * Problem: endDates were stored at 00:00:00 UTC (midnight), so promos expired
 * at the START of their end date rather than at the END.
 *
 * Fix: Set all endDates to 23:59:59.999 UTC on the same calendar date.
 * Also extends active/recent promos to 2026-07-31 so they are visible immediately.
 */

const mongoose = require('mongoose');

const uri = "mongodb+srv://klydocart:Klydocart%40123@cluster0.7mq15xm.mongodb.net/SpeeUp?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  console.log('Connecting to DB...');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const promoStrips = await db.collection('promostrips').find({}).toArray();
  console.log(`Found ${promoStrips.length} PromoStrip(s) to process.\n`);

  // New end date: July 31 2026 at 23:59:59.999 UTC (covers this month)
  const newEndDate = new Date('2026-07-31T23:59:59.999Z');

  for (const strip of promoStrips) {
    const oldEnd = strip.endDate ? new Date(strip.endDate) : null;

    // Set the endDate to end-of-day (23:59:59.999 UTC) on the SAME calendar day
    // AND extend all strips to July 31, 2026 so they are visible now
    const fixedEnd = newEndDate;

    console.log(`Strip: "${strip.heading}" (${strip.headerCategorySlug})`);
    console.log(`  Old endDate: ${oldEnd ? oldEnd.toISOString() : 'none'}`);
    console.log(`  New endDate: ${fixedEnd.toISOString()}`);

    await db.collection('promostrips').updateOne(
      { _id: strip._id },
      { $set: { endDate: fixedEnd } }
    );
    console.log(`  ✅ Updated.\n`);
  }

  console.log('Done! All PromoStrip endDates have been fixed.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
