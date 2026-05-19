import mongoose, { Document, Schema } from "mongoose";

export interface IReturn extends Document {
  order: mongoose.Types.ObjectId;
  orderItem: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  seller?: mongoose.Types.ObjectId;
  deliveryBoy?: mongoose.Types.ObjectId;

  // Return Info
  reason: string;
  description?: string;
  status: "Pending" | "Approved" | "Rejected" | "Processing" | "Completed" | "Picked Up";
  pickupStatus?: "Pending" | "Assigned" | "Picked Up" | "Dropped Off";

  // Items
  quantity: number;
  images?: string[]; // Images of returned items from customer
  pickupImages?: string[]; // Images uploaded by delivery boy upon pickup
  dropoffImages?: string[]; // Images uploaded by delivery boy upon dropoff to seller

  // Processing
  processedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  rejectionReason?: string;

  // Pickup
  pickupScheduled?: Date;
  pickupCompleted?: Date;
  pickupAddress?: {
    address: string;
    city: string;
    pincode: string;
  };

  // Refund
  refundAmount?: number;
  refundId?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const ReturnSchema = new Schema<IReturn>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order is required"],
    },
    orderItem: {
      type: Schema.Types.ObjectId,
      ref: "OrderItem",
      required: [true, "Order item is required"],
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"],
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
    },
    deliveryBoy: {
      type: Schema.Types.ObjectId,
      ref: "Delivery",
    },

    // Return Info
    reason: {
      type: String,
      required: [true, "Return reason is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Processing", "Completed", "Picked Up"],
      default: "Pending",
    },
    pickupStatus: {
      type: String,
      enum: ["Pending", "Assigned", "Picked Up", "Dropped Off"],
      default: "Pending",
    },

    // Items
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    images: {
      type: [String],
      default: [],
    },
    pickupImages: {
      type: [String],
      default: [],
    },
    dropoffImages: {
      type: [String],
      default: [],
    },

    // Processing
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    processedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },

    // Pickup
    pickupScheduled: {
      type: Date,
    },
    pickupCompleted: {
      type: Date,
    },
    pickupAddress: {
      address: String,
      city: String,
      pincode: String,
    },

    // Refund
    refundAmount: {
      type: Number,
      min: [0, "Refund amount cannot be negative"],
    },
    refundId: {
      type: Schema.Types.ObjectId,
      ref: "Refund",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ReturnSchema.index({ order: 1 });
ReturnSchema.index({ customer: 1 });
ReturnSchema.index({ seller: 1 });
ReturnSchema.index({ status: 1 });
ReturnSchema.index({ deliveryBoy: 1, pickupStatus: 1 });

const Return = mongoose.models.Return || mongoose.model<IReturn>("Return", ReturnSchema);

export default Return;
