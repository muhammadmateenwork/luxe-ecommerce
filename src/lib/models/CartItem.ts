import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICartItem extends Document {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  size?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1, min: 1 },
    size: { type: String },
    color: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.CartItem || mongoose.model<ICartItem>('CartItem', CartItemSchema);
