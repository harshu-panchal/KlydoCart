import mongoose from 'mongoose';
import { findDeliveryBoysNearSellerLocations } from './src/services/orderNotificationService';
import Order from './src/models/Order';
import OrderItem from './src/models/OrderItem';

async function run() {
    await mongoose.connect('mongodb+srv://klydocart:Klydocart%40123@cluster0.7mq15xm.mongodb.net/SpeeUp?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to db');
    const latestOrder = await Order.findOne({}).sort({ createdAt: -1 }).populate('items');
    if (!latestOrder) {
        console.log('No order found');
        process.exit(0);
    }
    console.log('Latest order ID:', latestOrder._id);
    const orderItems = await OrderItem.find({ order: latestOrder._id });
    latestOrder.items = orderItems;
    
    console.log('Items:', orderItems.length);
    const boys = await findDeliveryBoysNearSellerLocations(latestOrder);
    console.log('Resulting Boys:', boys);
    process.exit(0);
}
run().catch(console.error);
