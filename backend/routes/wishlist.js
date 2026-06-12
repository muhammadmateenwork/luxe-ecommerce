import { Router } from 'express';
import WishlistItem from '../models/WishlistItem.js';
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

// GET /api/wishlist
router.get('/', authMiddleware, async (req, res) => {
  try {
    const items = await WishlistItem.find({ userId: req.user.userId }).populate('productId');
    const wishlistItems = items.map(item => {
      const obj = docToObj(item);
      if (!obj.product && obj.productId) {
        obj.product = {
          id: obj.productId,
          name: 'Unknown Product',
          slug: '',
          price: 0,
          salePrice: null,
          images: [],
          stock: 0,
          brand: null,
          averageRating: 0,
          totalReviews: 0,
        };
      }
      return obj;
    }).filter(item => item.product);
    res.json({ success: true, data: wishlistItems });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/wishlist
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID is required' });
    }

    const existing = await WishlistItem.findOne({ userId: req.user.userId, productId });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Product already in wishlist' });
    }

    const wishlistItem = await WishlistItem.create({ userId: req.user.userId, productId });
    await wishlistItem.populate('productId');
    res.status(201).json({ success: true, data: docToObj(wishlistItem) });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/wishlist/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const wishlistItem = await WishlistItem.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!wishlistItem) {
      return res.status(404).json({ success: false, error: 'Wishlist item not found' });
    }
    res.json({ success: true, message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Delete wishlist error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
