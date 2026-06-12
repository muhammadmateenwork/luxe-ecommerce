import { Router } from 'express';
import CartItem from '../models/CartItem.js';
import Product from '../models/Product.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

function docToObj(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  const result = { id: _id.toString(), ...rest };
  if (result.productId && typeof result.productId === 'object' && result.productId._id) {
    const { _id: pid, __v: pv, ...productData } = result.productId.toObject ? result.productId.toObject() : result.productId;
    result.product = { id: pid.toString(), ...productData };
    result.productId = pid.toString();
  }
  return result;
}

// GET /api/cart
router.get('/', authMiddleware, async (req, res) => {
  try {
    const items = await CartItem.find({ userId: req.user.userId }).populate('productId');
    const cartItems = items.map(item => {
      const obj = docToObj(item);
      // Ensure product data is properly structured
      if (!obj.product && obj.productId) {
        obj.product = {
          id: obj.productId,
          name: 'Unknown Product',
          price: 0,
          salePrice: null,
          images: [],
          stock: 0,
          brand: null,
        };
      }
      return obj;
    }).filter(item => item.product);
    res.json({ success: true, data: cartItems });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/cart
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { productId, quantity = 1, size, color } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID is required' });
    }

    // Check if item already exists in cart
    const existing = await CartItem.findOne({
      userId: req.user.userId,
      productId,
      size: size || null,
      color: color || null,
    });

    if (existing) {
      existing.quantity += quantity;
      await existing.save();
      await existing.populate('productId');
      return res.json({ success: true, data: docToObj(existing) });
    }

    const cartItem = await CartItem.create({
      userId: req.user.userId,
      productId,
      quantity,
      size: size || undefined,
      color: color || undefined,
    });
    await cartItem.populate('productId');
    res.status(201).json({ success: true, data: docToObj(cartItem) });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/cart/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      return res.status(400).json({ success: false, error: 'Quantity must be at least 1' });
    }

    const cartItem = await CartItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { quantity },
      { new: true }
    ).populate('productId');

    if (!cartItem) {
      return res.status(404).json({ success: false, error: 'Cart item not found' });
    }
    res.json({ success: true, data: docToObj(cartItem) });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/cart/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const cartItem = await CartItem.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!cartItem) {
      return res.status(404).json({ success: false, error: 'Cart item not found' });
    }
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error('Delete cart error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
