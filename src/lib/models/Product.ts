import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  brand: string;
  price: number;
  salePrice?: number;
  sku: string;
  stock: number;
  sizes: string[];
  colors: string[];
  images: string[];
  categoryId: Types.ObjectId;
  category: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  isFlashSale: boolean;
  flashSaleEnds?: Date;
  averageRating: number;
  totalReviews: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    brand: { type: String, required: true },
    price: { type: Number, required: true },
    salePrice: { type: Number },
    sku: { type: String, required: true, unique: true },
    stock: { type: Number, default: 0 },
    sizes: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    images: { type: [String], default: [] },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    category: { type: String, required: true },
    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isFlashSale: { type: Boolean, default: false },
    flashSaleEnds: { type: Date },
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Text index for search
ProductSchema.index({ name: 'text', description: 'text', brand: 'text' });

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
