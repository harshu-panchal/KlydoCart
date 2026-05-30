import mongoose from 'mongoose';
import Order from '../models/Order';
import Seller from '../models/Seller';
import DeliveryTracking from '../models/DeliveryTracking';
import '../models/Delivery';
import '../models/OrderItem';
import '../models/Product';
import '../models/Customer';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/speedup');
    console.log('✓ Connected to MongoDB');

    // Find active orders
    const orders = await Order.find({
      status: { $nin: ['Delivered', 'Cancelled', 'Rejected', 'Returned'] }
    })
      .sort({ createdAt: -1 })
      .populate('deliveryBoy')
      .lean();

    console.log(`Found ${orders.length} latest orders:\n`);

    for (const order of orders) {
      console.log(`=========================================`);
      console.log(`Order ID: ${order._id}`);
      console.log(`Order Number: ${order.orderNumber}`);
      console.log(`Status: ${order.status}`);
      console.log(`Customer: ${order.customerName}`);
      console.log(`Delivery Address: ${order.deliveryAddress?.address}, ${order.deliveryAddress?.city}`);
      console.log(`Customer Coordinates: Lat=${order.deliveryAddress?.latitude}, Lng=${order.deliveryAddress?.longitude}`);
      
      if (order.deliveryBoy) {
        const db = order.deliveryBoy as any;
        console.log(`Delivery Boy: ${db.name} (ID: ${db._id})`);
        console.log(`Delivery Boy Coordinates:`, db.location);
      }

      // Check tracking
      const tracking = await DeliveryTracking.findOne({ order: order._id }).lean();
      if (tracking) {
        console.log(`Tracking record found:`);
        console.log(`  Status: ${tracking.status}`);
        console.log(`  Latitude: ${tracking.latitude}, Longitude: ${tracking.longitude}`);
        console.log(`  CurrentLocation:`, tracking.currentLocation);
      } else {
        console.log(`No tracking record found for this order.`);
      }

      // Check items and sellers
      const orderItems = await mongoose.model('OrderItem').find({ order: order._id }).lean();
      for (const item of orderItems) {
        const seller = await Seller.findById(item.seller).lean();
        if (seller) {
          console.log(`Seller: ${seller.storeName} (ID: ${seller._id})`);
          console.log(`  City: ${seller.city}`);
          console.log(`  Coordinates: Lat=${seller.latitude}, Lng=${seller.longitude}`);
          console.log(`  location (GeoJSON):`, seller.location);
        }
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();
