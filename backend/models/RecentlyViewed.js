import mongoose, { Schema } from 'mongoose';

const RecentlyViewedSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
}, { timestamps: true });

RecentlyViewedSchema.index({ userId: 1, productId: 1 }, { unique: true });

const RecentlyViewed = mongoose.models.RecentlyViewed || mongoose.model('RecentlyViewed', RecentlyViewedSchema);
export default RecentlyViewed;
