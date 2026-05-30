import mongoose from 'mongoose';
import Seller from '../models/Seller';
import Delivery from '../models/Delivery';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/speedup');
    console.log('✓ Connected to MongoDB');

    const sellers = await Seller.find({}).lean();
    console.log(`\n=== SELLERS (${sellers.length}) ===`);
    for (const s of sellers) {
      console.log(`- ${s.storeName} (${s.city}): Lat=${s.latitude}, Lng=${s.longitude}, GeoJSON=${JSON.stringify(s.location?.coordinates)}`);
    }

    const deliveryBoys = await Delivery.find({}).lean();
    console.log(`\n=== DELIVERY BOYS (${deliveryBoys.length}) ===`);
    for (const db of deliveryBoys) {
      console.log(`- ${db.name}: GeoJSON=${JSON.stringify(db.location?.coordinates)}`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();
