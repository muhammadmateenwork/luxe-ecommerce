import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRecentlyViewed extends Document {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  viewedAt: Date;
}

const RecentlyViewedSchema = new Schema<IRecentlyViewed>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    viewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.RecentlyViewed || mongoose.model<IRecentlyViewed>('RecentlyViewed', RecentlyViewedSchema);
