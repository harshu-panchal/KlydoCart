import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Delivery from '../models/Delivery';
import Order from '../models/Order';
import Return from '../models/Return';

dotenv.config();

const run = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI missing');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        console.log('Searching for delivery users...');
        const users = await Delivery.find({});
        console.log(`Found ${users.length} delivery users in total:`);
        
        let vinijUser: any = null;
        for (const u of users) {
            console.log(`- ID: ${u._id}, Name: ${u.name}, Mobile: ${u.mobile}, isOnline: ${u.isOnline}, Status: ${u.status}`);
            if (u.name && u.name.toLowerCase().includes('vinij')) {
                vinijUser = u;
            }
        }

        if (!vinijUser) {
            console.log('⚠️ vinij user not found in database. Inspecting the online one if any...');
            vinijUser = users.find(u => u.isOnline);
        }

        if (vinijUser) {
            const dbId = vinijUser._id;
            console.log(`\n================ INSPECTING USER: ${vinijUser.name} (${dbId}) ================`);
            
            // 1. Check active orders
            console.log('\n--- 1. Checking Active Orders in DB ---');
            const activeOrders = await Order.find({
                deliveryBoy: dbId,
            });
            console.log(`Found ${activeOrders.length} orders associated with this user:`);
            for (const o of activeOrders) {
                console.log(`  * Order: ${o.orderNumber} (${o._id}) | Status: ${o.status} | DeliveryBoyStatus: ${o.deliveryBoyStatus}`);
            }

            // 2. Check active returns
            console.log('\n--- 2. Checking Active Returns in DB ---');
            const activeReturns = await Return.find({
                deliveryBoy: dbId,
            });
            console.log(`Found ${activeReturns.length} return requests associated with this user:`);
            for (const r of activeReturns) {
                console.log(`  * Return: ${r._id} | Status: ${r.status} | PickupStatus: ${r.pickupStatus}`);
            }

            // 3. Test isDeliveryBoyBusy logic exactly
            console.log('\n--- 3. Testing isDeliveryBoyBusy Logic ---');
            const busyOrder = await Order.findOne({
                deliveryBoy: dbId,
                deliveryBoyStatus: { $in: ['Assigned', 'Picked Up', 'In Transit'] },
                status: { $nin: ['Delivered', 'Cancelled', 'Rejected', 'Returned'] }
            });
            console.log('  * Busy Order check result:', busyOrder ? `BUSY (Order: ${busyOrder.orderNumber}, status: ${busyOrder.status}, deliveryBoyStatus: ${busyOrder.deliveryBoyStatus})` : 'NOT BUSY');

            const busyReturn = await Return.findOne({
                deliveryBoy: dbId,
                pickupStatus: { $in: ['Assigned', 'Picked Up'] }
            });
            console.log('  * Busy Return check result:', busyReturn ? `BUSY (Return ID: ${busyReturn._id}, status: ${busyReturn.status}, pickupStatus: ${busyReturn.pickupStatus})` : 'NOT BUSY');

            const isBusy = !!busyOrder || !!busyReturn;
            console.log(`  => Overall isBusy: ${isBusy}`);
        } else {
            console.log('❌ No eligible delivery boy found at all.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
