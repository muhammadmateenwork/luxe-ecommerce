import mongoose, { Schema } from 'mongoose';

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
  paymentMethod: { type: String, enum: ['cod', 'stripe'], default: 'cod' },
  deliveredAt: { type: Date },
  cancelledAt: { type: Date },
}, { timestamps: true });

OrderSchema.index({ userId: 1 });

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export default Order;
