import mongoose, { Schema, Document } from "mongoose";

export interface IPromoStrip extends Document {
  headerCategorySlug: string; // Links to HeaderCategory slug (e.g., "all", "grocery", "fashion")
  heading: string; // e.g., "HOUSEFULL SALE"
  saleText: string; // e.g., "SALE"
  startDate: Date; // Sale start date
  endDate: Date; // Sale end date
  categoryCards: Array<{
    categoryId: mongoose.Types.ObjectId; // Reference to Category
    title: string; // Custom title for the card
    badge: string; // e.g., "Up to 55% OFF"
    discountPercentage: number; // Discount percentage (0-100)
    order: number; // Display order
  }>;
  featuredProducts: mongoose.Types.ObjectId[]; // Array of Product IDs for "CRAZY DEALS"
  crazyDealsTitle?: string; // Custom title for the CRAZY DEALS section (e.g., "CRAZY DEALS", "SPECIAL OFFERS")
  secondaryBoxTitle?: string; // Custom title for the secondary bottom-left box (e.g., "RESTAURANT & FAST FOOD")
  secondaryFeaturedProducts?: mongoose.Types.ObjectId[]; // Array of Product IDs for secondary bottom-left box
  // Explicit Header Category mapping for the 4 Housefull Sale right-side boxes
  // Slot 0 = Box 1, Slot 1 = Box 2, Slot 2 = Box 3, Slot 3 = Box 4
  housefullCategorySlots?: Array<{
    slotIndex: number; // 0-3, determines box position
    headerCategoryId: mongoose.Types.ObjectId; // Reference to HeaderCategory
    headerCategoryName: string; // Denormalized name for fast reads
    displayCount?: number; // 1, 2, 3, or 4 (default: 4)
    selectedProductIds?: mongoose.Types.ObjectId[]; // Specific products selected by Admin
  }>;
  isActive: boolean; // Enable/disable the PromoStrip
  order: number; // For sorting if multiple PromoStrips per category
  createdAt: Date;
  updatedAt: Date;
}

const PromoStripSchema = new Schema<IPromoStrip>(
  {
    headerCategorySlug: {
      type: String,
      required: [true, "Header category slug is required"],
      trim: true,
      lowercase: true,
    },
    heading: {
      type: String,
      required: [true, "Heading is required"],
      trim: true,
      maxlength: [50, "Heading cannot exceed 50 characters"],
    },
    saleText: {
      type: String,
      required: [true, "Sale text is required"],
      trim: true,
      maxlength: [20, "Sale text cannot exceed 20 characters"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
      validate: {
        validator: function (this: IPromoStrip, value: Date) {
          return value > this.startDate;
        },
        message: "End date must be after start date",
      },
    },
    categoryCards: [
      {
        categoryId: {
          type: Schema.Types.ObjectId,
          ref: "Category",
          required: true,
        },
        title: {
          type: String,
          required: true,
          trim: true,
        },
        badge: {
          type: String,
          required: true,
          trim: true,
        },
        discountPercentage: {
          type: Number,
          required: true,
          min: [0, "Discount percentage cannot be negative"],
          max: [100, "Discount percentage cannot exceed 100"],
        },
        order: {
          type: Number,
          default: 0,
        },
      },
    ],
    featuredProducts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    // Explicit 4-slot Header Category mapping for the Housefull Sale right-side boxes
    housefullCategorySlots: [
      {
        slotIndex: {
          type: Number,
          required: true,
          min: [0, "Slot index must be 0-3"],
          max: [3, "Slot index must be 0-3"],
        },
        headerCategoryId: {
          type: Schema.Types.ObjectId,
          ref: "HeaderCategory",
          required: true,
        },
        headerCategoryName: {
          type: String,
          required: true,
          trim: true,
        },
        headerCategorySlug: {
          type: String,
          required: true,
          trim: true,
        },
        displayCount: {
          type: Number,
          default: 4,
          min: 1,
          max: 4,
        },
        selectedProductIds: [
          {
            type: Schema.Types.ObjectId,
            ref: "Product",
          },
        ],
      },
    ],
    crazyDealsTitle: {
      type: String,
      trim: true,
      maxlength: [30, "Crazy Deals title cannot exceed 30 characters"],
      default: "CRAZY DEALS",
    },
    secondaryBoxTitle: {
      type: String,
      trim: true,
      maxlength: [40, "Secondary box title cannot exceed 40 characters"],
      default: "RESTAURANT & FAST FOOD",
    },
    secondaryFeaturedProducts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
// Compound index for the most common query: headerCategorySlug + isActive + date range
PromoStripSchema.index({ headerCategorySlug: 1, isActive: 1, startDate: 1, endDate: 1 });
PromoStripSchema.index({ order: 1 });

const PromoStrip = mongoose.model<IPromoStrip>("PromoStrip", PromoStripSchema);

export default PromoStrip;

