import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IDelivery extends Document {
  // Personal Information
  name: string;
  mobile: string;
  alternateMobile?: string;
  email: string;
  dateOfBirth?: Date;
  age?: number;
  fatherName?: string;
  password: string;
  address: string; // Current Address
  permanentAddress?: string;
  city: string;
  state?: string;
  pincode?: string;
  emergencyContact?: string;
  profilePic?: string;

  // Documents (URLs pointing to cloud storage)
  drivingLicense?: string;
  nationalIdentityCard?: string; // Aadhaar Front/Back or ID
  aadhaarNumber?: string;
  panNumber?: string;
  marksheet?: string;
  policeVerification?: string; // 'Yes' | 'No'
  signature?: string;

  // Bank Account Information
  accountName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  upiId?: string;

  // Vehicle Information
  vehicleNumber?: string;
  vehicleType?: string;
  drivingLicenseNumber?: string;
  rcNumber?: string;
  vehicleInsuranceNumber?: string;
  insuranceValidTill?: Date;

  // Commission & Payment
  bonusType?: string; // 'Fixed' | 'Salaried' | 'Commission Based'
  commissionRate?: number; // Individual commission rate (overrides global setting)
  status: 'Active' | 'Inactive';
  isOnline: boolean; // Availability status (synced with available field)
  available?: string; // 'Available' | 'Not Available' (admin-facing label)
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  balance: number;
  cashCollected: number;
  pendingAdminPayout: number;
  settings: {
    notifications: boolean;
    location: boolean;
    sound: boolean;
  };
  fcmTokens?: string[];
  fcmTokenMobile?: string[];

  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const DeliverySchema = new Schema<IDelivery>(
  {
    // Personal Information
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true,
      trim: true,
      validate: {
        validator: function (v: string) {
          return /^[0-9]{10}$/.test(v);
        },
        message: 'Mobile number must be 10 digits',
      },
    },
    alternateMobile: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Please enter a valid email address',
      },
    },
    dateOfBirth: {
      type: Date,
    },
    age: {
      type: Number,
    },
    fatherName: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    address: {
      type: String,
      required: false,
      trim: true,
    },
    permanentAddress: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      required: false,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    emergencyContact: {
      type: String,
      trim: true,
    },
    profilePic: {
      type: String,
      trim: true,
    },

    // Documents (URLs)
    drivingLicense: {
      type: String,
      trim: true,
    },
    nationalIdentityCard: {
      type: String,
      trim: true,
    },
    aadhaarNumber: {
      type: String,
      trim: true,
    },
    panNumber: {
      type: String,
      trim: true,
    },
    marksheet: {
      type: String,
      trim: true,
    },
    policeVerification: {
      type: String,
      enum: ['Yes', 'No'],
      default: 'No',
    },
    signature: {
      type: String,
      trim: true,
    },

    // Bank Account Information
    accountName: {
      type: String,
      trim: true,
    },
    bankName: {
      type: String,
      trim: true,
    },
    accountNumber: {
      type: String,
      trim: true,
    },
    ifscCode: {
      type: String,
      trim: true,
    },
    branchName: {
      type: String,
      trim: true,
    },
    upiId: {
      type: String,
      trim: true,
    },

    // Vehicle Information
    vehicleNumber: {
      type: String,
      trim: true,
    },
    vehicleType: {
      type: String,
      trim: true,
    },
    drivingLicenseNumber: {
      type: String,
      trim: true,
    },
    rcNumber: {
      type: String,
      trim: true,
    },
    vehicleInsuranceNumber: {
      type: String,
      trim: true,
    },
    insuranceValidTill: {
      type: Date,
    },

    // Commission & Payment
    bonusType: {
      type: String,
      trim: true,
    },
    commissionRate: {
      type: Number,
      min: [0, 'Commission rate cannot be negative'],
      max: [100, 'Commission rate cannot exceed 100%'],
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Inactive', // New delivery partners start as Inactive until approved
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    available: {
      type: String,
      enum: ['Available', 'Not Available'],
      default: 'Not Available',
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative'],
    },
    cashCollected: {
      type: Number,
      default: 0,
      min: [0, 'Cash collected cannot be negative'],
    },
    pendingAdminPayout: {
      type: Number,
      default: 0,
      min: [0, 'Pending admin payout cannot be negative'],
    },
    settings: {
      notifications: { type: Boolean, default: true },
      location: { type: Boolean, default: true },
      sound: { type: Boolean, default: true }
    },
    fcmTokens: {
      type: [String],
      default: [],
    },
    fcmTokenMobile: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
DeliverySchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password
DeliverySchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

DeliverySchema.index({ location: '2dsphere' });

const Delivery = mongoose.model<IDelivery>('Delivery', DeliverySchema);

export default Delivery;
