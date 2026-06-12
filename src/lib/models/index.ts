import mongoose, { Schema } from 'mongoose';

// Product Schema
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

export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// Category Schema
const CategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  image: { type: String },
}, { timestamps: true });

export const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

// User Schema
const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String },
  avatar: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isBlocked: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Review Schema
const ReviewSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String },
  comment: { type: String },
}, { timestamps: true });

ReviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);

// CartItem Schema
const CartItemSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  size: { type: String },
  color: { type: String },
}, { timestamps: true });

CartItemSchema.index({ userId: 1 });

export const CartItem = mongoose.models.CartItem || mongoose.model('CartItem', CartItemSchema);

// WishlistItem Schema
const WishlistItemSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
}, { timestamps: true });

WishlistItemSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const WishlistItem = mongoose.models.WishlistItem || mongoose.model('WishlistItem', WishlistItemSchema);

// Order Schema
const OrderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  orderNumber: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  subtotal: { type: Number, required: true },
  shippingCost: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  shippingAddress: {
    firstName: String,
    lastName: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  shippingMethod: { type: String, default: 'standard' },
  paymentMethod: { type: String, enum: ['cod', 'stripe'], default: 'cod' },
  deliveredAt: { type: Date },
  cancelledAt: { type: Date },
}, { timestamps: true });

OrderSchema.index({ userId: 1 });

export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

// OrderItem Schema
const OrderItemSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true },
  image: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  size: { type: String },
  color: { type: String },
});

export const OrderItem = mongoose.models.OrderItem || mongoose.model('OrderItem', OrderItemSchema);

// Coupon Schema
const CouponSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  discount: { type: Number, required: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  minPurchase: { type: Number, default: 0 },
  maxDiscount: { type: Number },
  usageLimit: { type: Number },
  usedCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date },
}, { timestamps: true });

export const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);

// Newsletter Schema
const NewsletterSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
}, { timestamps: true });

export const Newsletter = mongoose.models.Newsletter || mongoose.model('Newsletter', NewsletterSchema);

// RecentlyViewed Schema
const RecentlyViewedSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
}, { timestamps: true });

RecentlyViewedSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const RecentlyViewed = mongoose.models.RecentlyViewed || mongoose.model('RecentlyViewed', RecentlyViewedSchema);

// GiftCard Schema
const GiftCardSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  salePrice: { type: Number },
  image: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const GiftCard = mongoose.models.GiftCard || mongoose.model('GiftCard', GiftCardSchema);

// DeliveryMethod Schema
const DeliveryMethodSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true, default: 0 },
  freeOverAmount: { type: Number },
  estimatedDays: { type: String },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

export const DeliveryMethod = mongoose.models.DeliveryMethod || mongoose.model('DeliveryMethod', DeliveryMethodSchema);
