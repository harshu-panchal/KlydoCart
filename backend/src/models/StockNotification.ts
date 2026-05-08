import mongoose, { Document, Schema } from "mongoose";

export interface IStockNotification extends Document {
  customerId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  variantId?: string;
  email?: string;
  phone?: string;
  isNotified: boolean;
  notifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StockNotificationSchema = new Schema<IStockNotification>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer ID is required"],
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
    },
    variantId: {
      type: String,
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    isNotified: {
      type: Boolean,
      default: false,
    },
    notifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
StockNotificationSchema.index({ customerId: 1, productId: 1, variantId: 1 });
StockNotificationSchema.index({ productId: 1, isNotified: 1 });
StockNotificationSchema.index({ isNotified: 1 });

const StockNotification = mongoose.model<IStockNotification>(
  "StockNotification",
  StockNotificationSchema
);

export default StockNotification;
