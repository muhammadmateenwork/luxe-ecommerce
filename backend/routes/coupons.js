import { Router } from 'express';
import Coupon from '../models/Coupon.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

function docToObj(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  return { id: _id.toString(), ...rest };
}

// GET /api/coupons
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const [coupons, total] = await Promise.all([
      Coupon.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Coupon.countDocuments(),
    ]);
    res.json({
      success: true,
      data: { coupons: coupons.map(docToObj), pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/coupons
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json({ success: true, data: docToObj(coupon) });
  } catch (error) {
    console.error('Create coupon error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Coupon code already exists' });
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/coupons/:id
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ success: false, error: 'Coupon not found' });
    res.json({ success: true, data: docToObj(coupon) });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/coupons/:id
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, error: 'Coupon not found' });
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/coupons/validate
router.post('/validate', authMiddleware, async (req, res) => {
  try {
    const { code, cartTotal } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Coupon code is required' });

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) return res.status(404).json({ success: false, error: 'Invalid coupon code' });
    if (coupon.expiresAt && coupon.expiresAt < new Date()) return res.status(400).json({ success: false, error: 'Coupon has expired' });
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ success: false, error: 'Coupon usage limit reached' });
    if (coupon.minPurchase && cartTotal < coupon.minPurchase) return res.status(400).json({ success: false, error: `Minimum purchase of $${coupon.minPurchase} required` });

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = cartTotal * (coupon.discount / 100);
      if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
    } else {
      discount = coupon.discount;
    }

    res.json({ success: true, data: { discount, code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discount } });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
