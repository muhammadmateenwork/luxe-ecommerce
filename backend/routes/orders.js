import { Router } from 'express';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

function docToObj(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  const result = { id: _id.toString(), ...rest };
  if (result.userId && typeof result.userId === 'object' && result.userId._id) {
    const { _id: uid, __v: uv, password, ...userData } = result.userId.toObject ? result.userId.toObject() : result.userId;
    result.user = { id: uid.toString(), ...userData };
    result.userId = uid.toString();
  }
  return result;
}

// GET /api/orders
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { userId: req.user.userId };
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name email'),
      Order.countDocuments(filter),
    ]);

    // Get order items for each order
    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const items = await OrderItem.find({ orderId: order._id });
      const orderObj = docToObj(order);
      orderObj.items = items.map(i => {
        const obj = i.toObject ? i.toObject() : i;
        const { _id, __v, ...rest } = obj;
        return { id: _id.toString(), ...rest };
      });
      return orderObj;
    }));

    res.json({
      success: true,
      data: {
        orders: ordersWithItems,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/orders/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('userId', 'name email');
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Check if user owns the order or is admin
    if (req.user.role !== 'admin' && order.userId._id.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const items = await OrderItem.find({ orderId: order._id });
    const orderObj = docToObj(order);
    orderObj.items = items.map(i => {
      const obj = i.toObject ? i.toObject() : i;
      const { _id, __v, ...rest } = obj;
      return { id: _id.toString(), ...rest };
    });

    res.json({ success: true, data: orderObj });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/orders
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod = 'cod', couponCode } = req.body;

    // Get cart items
    const CartItem = (await import('../models/CartItem.js')).default;
    const cartItems = await CartItem.find({ userId: req.user.userId }).populate('productId');
    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }

    let subtotal = 0;
    const orderItemsData = cartItems.map(item => {
      const product = item.productId;
      const price = product.salePrice || product.price;
      subtotal += price * item.quantity;
      return {
        productId: product._id,
        name: product.name,
        image: product.images[0] || '',
        price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      };
    });

    let discount = 0;
    if (couponCode) {
      const Coupon = (await import('../models/Coupon.js')).default;
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon) {
        if (coupon.expiresAt && coupon.expiresAt < new Date()) {
          return res.status(400).json({ success: false, error: 'Coupon has expired' });
        }
        if (coupon.minPurchase && subtotal < coupon.minPurchase) {
          return res.status(400).json({ success: false, error: `Minimum purchase of $${coupon.minPurchase} required` });
        }
        if (coupon.discountType === 'percentage') {
          discount = subtotal * (coupon.discount / 100);
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
          }
        } else {
          discount = coupon.discount;
        }
        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    const shippingCost = subtotal > 100 ? 0 : 10;
    const total = subtotal - discount + shippingCost;
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const order = await Order.create({
      userId: req.user.userId,
      orderNumber,
      subtotal,
      shippingCost,
      discount,
      total,
      shippingAddress,
      paymentMethod,
    });

    // Create order items
    for (const itemData of orderItemsData) {
      await OrderItem.create({ orderId: order._id, ...itemData });
    }

    // Clear cart
    await CartItem.deleteMany({ userId: req.user.userId });

    res.status(201).json({ success: true, data: { orderId: order._id, orderNumber } });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/orders/:id
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const updateData = { status };
    if (status === 'delivered') updateData.deliveredAt = new Date();
    if (status === 'cancelled') updateData.cancelledAt = new Date();

    const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, data: docToObj(order) });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    await OrderItem.deleteMany({ orderId: order._id });
    res.json({ success: true, message: 'Order deleted' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
