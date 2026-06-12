import { Router } from 'express';
import Newsletter from '../models/Newsletter.js';
import RecentlyViewed from '../models/RecentlyViewed.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/newsletter
router.post('/newsletter', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const existing = await Newsletter.findOne({ email: email.toLowerCase() });
    if (existing) return res.json({ success: true, message: 'Already subscribed' });

    await Newsletter.create({ email: email.toLowerCase() });
    res.json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Newsletter error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/recently-viewed
router.post('/recently-viewed', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, error: 'Product ID is required' });

    await RecentlyViewed.findOneAndUpdate(
      { userId: req.user.userId, productId },
      { createdAt: new Date() },
      { upsert: true }
    );

    // Keep only last 20
    const items = await RecentlyViewed.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    if (items.length > 20) {
      const idsToRemove = items.slice(20).map(i => i._id);
      await RecentlyViewed.deleteMany({ _id: { $in: idsToRemove } });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Recently viewed error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
