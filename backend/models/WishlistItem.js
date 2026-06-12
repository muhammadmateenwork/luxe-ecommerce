import mongoose, { Schema } from 'mongoose';

const WishlistItemSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
}, { timestamps: true });

WishlistItemSchema.index({ userId: 1, productId: 1 }, { unique: true });

const WishlistItem = mongoose.models.WishlistItem || mongoose.model('WishlistItem', WishlistItemSchema);
export default WishlistItem;
