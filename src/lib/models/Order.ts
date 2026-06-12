import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOrder extends Document {
  userId: Types.ObjectId;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  shippingAddress: Record<string, unknown>;
  billingAddress?: Record<string, unknown>;
  paymentMethod: string;
  couponCode?: string;
  notes?: string;
  deliveredAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderNumber: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    shippingAddress: { type: Schema.Types.Mixed, required: true },
    billingAddress: { type: Schema.Types.Mixed },
    paymentMethod: { type: String, required: true },
    couponCode: { type: String },
    notes: { type: String },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
