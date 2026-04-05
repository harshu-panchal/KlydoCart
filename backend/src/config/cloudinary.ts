import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Validate configuration
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.warn("⚠️  Cloudinary credentials not found in environment variables");
}

export default cloudinary;

// Folder structure constants
export const CLOUDINARY_FOLDERS = {
  PRODUCTS: "klydocart/products",
  PRODUCT_GALLERY: "klydocart/products/gallery",
  CATEGORIES: "klydocart/categories",
  SUBCATEGORIES: "klydocart/subcategories",
  COUPONS: "klydocart/coupons",
  SELLERS: "klydocart/sellers",
  SELLER_PROFILE: "klydocart/sellers/profile",
  SELLER_DOCUMENTS: "klydocart/sellers/documents",
  DELIVERY: "klydocart/delivery",
  DELIVERY_DOCUMENTS: "klydocart/delivery/documents",
  STORES: "klydocart/stores",
  USERS: "klydocart/users",
} as const;
