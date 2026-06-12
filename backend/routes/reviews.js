import { Router } from 'express';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
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

// GET /api/reviews
router.get('/', async (req, res) => {
  try {
    const { productId, page = '1', limit = '10' } = req.query;
    const filter = {};
    if (productId) filter.productId = productId;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).populate('userId', 'name avatar'),
      Review.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        reviews: reviews.map(docToObj),
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/reviews
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { productId, rating, title, comment } = req.body;
    if (!productId || !rating) {
      return res.status(400).json({ success: false, error: 'Product ID and rating are required' });
    }

    // Check if user already reviewed this product
    const existing = await Review.findOne({ userId: req.user.userId, productId });
    if (existing) {
      return res.status(400).json({ success: false, error: 'You have already reviewed this product' });
    }

    const review = await Review.create({
      userId: req.user.userId, productId, rating, title, comment,
    });

    // Update product rating
    const reviews = await Review.find({ productId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await Product.findByIdAndUpdate(productId, {
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews: reviews.length,
    });

    await review.populate('userId', 'name avatar');
    res.status(201).json({ success: true, data: docToObj(review) });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/reviews/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, error: 'Review not found' });

    // Only admin or review owner can delete
    if (req.user.role !== 'admin' && review.userId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const productId = review.productId;
    await Review.findByIdAndDelete(req.params.id);

    // Update product rating
    const reviews = await Review.find({ productId });
    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    await Product.findByIdAndUpdate(productId, {
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews: reviews.length,
    });

    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
