import mongoose, { Schema } from 'mongoose';

const CartItemSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  size: { type: String },
  color: { type: String },
}, { timestamps: true });

CartItemSchema.index({ userId: 1 });

const CartItem = mongoose.models.CartItem || mongoose.model('CartItem', CartItemSchema);
export default CartItem;
