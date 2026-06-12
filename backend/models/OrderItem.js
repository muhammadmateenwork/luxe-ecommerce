import mongoose, { Schema } from 'mongoose';

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

const OrderItem = mongoose.models.OrderItem || mongoose.model('OrderItem', OrderItemSchema);
export default OrderItem;
