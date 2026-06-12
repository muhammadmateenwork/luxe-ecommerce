import mongoose, { Schema } from 'mongoose';

const ReviewSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String },
  comment: { type: String },
}, { timestamps: true });

ReviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
export default Review;
