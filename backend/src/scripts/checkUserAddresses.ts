import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/speedup');
    console.log('✓ Connected to MongoDB');

    const AddressSchema = new mongoose.Schema({}, { strict: false });
    const AddressModel = mongoose.model<any>('Address', AddressSchema, 'addresses');

    const addresses = await AddressModel.find({}).lean();
    console.log(`\n=== ADDRESSES (${addresses.length}) ===`);
    for (const addr of addresses) {
      console.log(`- User: ${addr.user || addr.customerId || 'N/A'}`);
      console.log(`  Name: ${addr.fullName || addr.name}`);
      console.log(`  Address: ${addr.address || addr.street}`);
      console.log(`  City/State: ${addr.city}, ${addr.state}`);
      console.log(`  Coordinates: Lat=${addr.latitude}, Lng=${addr.longitude}`);
      console.log(`  Location object:`, addr.location);
      console.log('------------------');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();
