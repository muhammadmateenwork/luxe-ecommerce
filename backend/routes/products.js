import { Router } from 'express';
import Product from '../models/Product.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

function docToObj(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  const result = { id: _id.toString(), ...rest };
  if (result.categoryId && typeof result.categoryId === 'object' && result.categoryId._id) {
    result.categoryId = docToObj(result.categoryId);
  }
  return result;
}

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const {
      category, search, minPrice, maxPrice, sizes, colors, rating,
      sort = 'newest', page = '1', limit = '12',
      featured, newArrival, bestSeller, trending, flashSale, onSale,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }
    if (minPrice || maxPrice) {
      const priceFilter = {};
      if (minPrice) priceFilter.$gte = parseFloat(minPrice);
      if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
      filter.price = priceFilter;
    }
    if (featured === 'true') filter.isFeatured = true;
    if (newArrival === 'true') filter.isNewArrival = true;
    if (bestSeller === 'true') filter.isBestSeller = true;
    if (trending === 'true') filter.isTrending = true;
    if (flashSale === 'true') filter.isFlashSale = true;
    if (onSale === 'true') filter.salePrice = { $ne: null, $gt: 0 };
    if (sizes) filter.sizes = { $in: sizes.split(',').map(s => s.trim()) };
    if (colors) filter.colors = { $in: colors.split(',').map(c => c.trim()) };
    if (rating) filter.averageRating = { $gte: parseFloat(rating) };

    let sortObj = {};
    switch (sort) {
      case 'price_asc': sortObj = { price: 1 }; break;
      case 'price_desc': sortObj = { price: -1 }; break;
      case 'newest': sortObj = { createdAt: -1 }; break;
      case 'popular': sortObj = { totalReviews: -1 }; break;
      case 'top_rated': sortObj = { averageRating: -1 }; break;
      default: sortObj = { createdAt: -1 };
    }

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortObj).skip(skip).limit(limitNum).populate('categoryId', 'name slug'),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        products: products.map(docToObj),
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('categoryId', 'name slug');
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: docToObj(product) });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/products
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, slug, description, brand, price, salePrice, sku, stock, sizes, colors, images, categoryId, category, isFeatured, isNewArrival, isBestSeller, isTrending, isFlashSale, flashSaleEnds } = req.body;
    if (!name || !slug || !description || !brand || !price || !sku || !categoryId || !category) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const existing = await Product.findOne({ $or: [{ slug }, { sku }] });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Product with this slug or SKU already exists' });
    }

    const product = await Product.create({
      name, slug, description, brand, price: parseFloat(price),
      salePrice: salePrice ? parseFloat(salePrice) : undefined,
      sku, stock: stock || 0, sizes: sizes || [], colors: colors || [], images: images || [],
      categoryId, category, isFeatured: isFeatured || false, isNewArrival: isNewArrival || false,
      isBestSeller: isBestSeller || false, isTrending: isTrending || false,
      isFlashSale: isFlashSale || false, flashSaleEnds: flashSaleEnds ? new Date(flashSaleEnds) : undefined,
    });

    await product.populate('categoryId', 'name slug');
    res.status(201).json({ success: true, data: docToObj(product) });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/products/:id
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.salePrice) updateData.salePrice = parseFloat(updateData.salePrice);
    if (updateData.stock) updateData.stock = parseInt(updateData.stock);

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).populate('categoryId', 'name slug');
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: docToObj(product) });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
