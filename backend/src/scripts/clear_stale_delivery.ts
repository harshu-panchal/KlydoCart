import dotenv from 'dotenv';
import mongoose from 'mongoose';
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

        const dbId = new mongoose.Types.ObjectId('69fb2d69a371628c09f6fc05'); // vinij's ID
        console.log(`Clearing stale orders and returns for delivery partner ID: ${dbId}`);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // 1. Find stale orders (created before today, uncompleted but assigned to vinij)
        const staleOrders = await Order.find({
            deliveryBoy: dbId,
            createdAt: { $lt: todayStart },
            status: { $nin: ['Delivered', 'Cancelled', 'Rejected', 'Returned'] }
        });

        console.log(`Found ${staleOrders.length} stale orders assigned to vinij.`);

        let updatedOrdersCount = 0;
        for (const order of staleOrders) {
            // Unassign the delivery boy so these orders are returned to the pool and don't block him
            order.deliveryBoy = undefined;
            order.deliveryBoyStatus = undefined;
            order.assignedAt = undefined;
            // Optionally rollback the status to Accepted if it was Processed during assignment
            if (order.status === 'Processed') {
                order.status = 'Accepted';
            }
            await order.save();
            updatedOrdersCount++;
        }
        console.log(`Successfully unassigned ${updatedOrdersCount} stale orders from vinij.`);

        // 2. Also ensure completed/rejected returns don't have active pickupStatus
        const completedReturns = await Return.find({
            deliveryBoy: dbId,
            status: { $in: ['Completed', 'Rejected'] },
            pickupStatus: { $in: ['Assigned', 'Picked Up'] }
        });

        console.log(`Found ${completedReturns.length} completed/rejected returns with active pickup status.`);
        let updatedReturnsCount = 0;
        for (const ret of completedReturns) {
            ret.pickupStatus = 'Dropped Off';
            await ret.save();
            updatedReturnsCount++;
        }
        console.log(`Successfully updated ${updatedReturnsCount} returns to 'Dropped Off'.`);

    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
