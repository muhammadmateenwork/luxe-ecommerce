import mongoose, { Schema } from 'mongoose';

const ProductSchema = new Schema({
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
}, { timestamps: true });

ProductSchema.index({ name: 'text', description: 'text', brand: 'text' });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
export default Product;
