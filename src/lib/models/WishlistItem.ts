import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWishlistItem extends Document {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  createdAt: Date;
}

const WishlistItemSchema = new Schema<IWishlistItem>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  },
  { timestamps: true }
);

WishlistItemSchema.index({ userId: 1, productId: 1 }, { unique: true });

export default mongoose.models.WishlistItem || mongoose.model<IWishlistItem>('WishlistItem', WishlistItemSchema);
