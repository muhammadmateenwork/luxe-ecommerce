import { Router } from 'express';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import CartItem from '../models/CartItem.js';
import WishlistItem from '../models/WishlistItem.js';
import OrderItem from '../models/OrderItem.js';
import RecentlyViewed from '../models/RecentlyViewed.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

function docToObj(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  return { id: _id.toString(), ...rest };
}

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    const categoriesWithCount = await Promise.all(categories.map(async (cat) => {
      const productCount = await Product.countDocuments({ categoryId: cat._id });
      return { ...docToObj(cat), _count: { products: productCount } };
    }));
    res.json({ success: true, data: categoriesWithCount });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/categories
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, slug, description, image } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ success: false, error: 'Name and slug are required' });
    }
    const category = await Category.create({ name, slug, description, image });
    res.status(201).json({ success: true, data: docToObj(category) });
  } catch (error) {
    console.error('Create category error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Category with this name or slug already exists' });
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/categories/:id
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    res.json({ success: true, data: docToObj(category) });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // Find all products in this category
    const productsInCategory = await Product.find({ categoryId: req.params.id }).select('_id');
    const productIds = productsInCategory.map(p => p._id);

    if (productIds.length > 0) {
      // Delete all related data for these products
      await Promise.all([
        Review.deleteMany({ productId: { $in: productIds } }),
        CartItem.deleteMany({ productId: { $in: productIds } }),
        WishlistItem.deleteMany({ productId: { $in: productIds } }),
        RecentlyViewed.deleteMany({ productId: { $in: productIds } }),
        // Nullify product references in order items (keep order history intact)
        OrderItem.updateMany({ productId: { $in: productIds } }, { $set: { productId: null } }),
      ]);

      // Delete the products themselves
      await Product.deleteMany({ categoryId: req.params.id });
    }

    res.json({
      success: true,
      message: `Category deleted along with ${productIds.length} product(s) and their related data`,
      data: { deletedProducts: productIds.length },
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, error: 'Internal server server error' });
  }
});

export default router;
