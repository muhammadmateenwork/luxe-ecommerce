const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const {
  Product, Category, User, Review, CartItem, WishlistItem,
  Order, OrderItem, Coupon, Newsletter, RecentlyViewed,
  GiftCard, DeliveryMethod,
} = require('./models');

const {
  docToObj, docToObjUser, docToObjWithProduct, docToObjWithCategory,
  docToObjWithUser, itemToObj,
  authMiddleware, optionalAuth, adminMiddleware,
} = require('./middleware');

const JWT_SECRET = process.env.JWT_SECRET || 'luxe-ecommerce-jwt-secret-key-2024-production';
const PORT = process.env.PORT || 3001;

const app = express();

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Disable keep-alive to prevent proxy connection issues
app.use((req, res, next) => {
  res.setHeader('Connection', 'close');
  next();
});

// Global error handler for JSON parse errors and other errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ success: false, error: 'Invalid JSON' });
  }
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// MongoDB Connection
let isConnected = false;
async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Helper: recalculate product rating
async function recalculateProductRating(productId) {
  const stats = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg = stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;
  const total = stats.length > 0 ? stats[0].count : 0;
  await Product.findByIdAndUpdate(productId, { averageRating: avg, totalReviews: total });
}

// ==================== AUTH ROUTES ====================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    await connectDB();
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
    });
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ success: true, data: { user: docToObjUser(user), token } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    await connectDB();
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ success: false, error: 'Your account has been blocked' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ success: true, data: { user: docToObjUser(user), token } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const dbUser = await User.findById(req.user.userId);
    if (!dbUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: docToObjUser(dbUser) });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const resetToken = jwt.sign({ email, purpose: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ success: true, message: 'Password reset email sent', resetToken });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    await connectDB();
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: 'Token and new password are required' });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }
    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({ success: false, error: 'Invalid or expired token' });
  }
});

// ==================== PRODUCT ROUTES ====================

// GET /api/products
app.get('/api/products', async (req, res) => {
  try {
    await connectDB();
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
    if (flashSale === 'true') {
      filter.isFlashSale = true;
      filter.flashSaleEnds = { $gt: new Date() };
    }
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

    let flashSaleEndsAt = null;
    if (flashSale === 'true' && products.length > 0) {
      const earliestProduct = products.reduce((earliest, p) => {
        const pEnd = p.flashSaleEnds ? new Date(p.flashSaleEnds).getTime() : Infinity;
        const eEnd = earliest ? (earliest.flashSaleEnds ? new Date(earliest.flashSaleEnds).getTime() : Infinity) : Infinity;
        return pEnd < eEnd ? p : earliest;
      }, products[0]);
      if (earliestProduct?.flashSaleEnds) {
        flashSaleEndsAt = new Date(earliestProduct.flashSaleEnds).toISOString();
      }
    }

    const responseData = {
      products: products.map(docToObjWithCategory),
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    };
    if (flashSaleEndsAt) responseData.flashSaleEndsAt = flashSaleEndsAt;

    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/products (admin)
app.post('/api/products', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
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
    res.status(201).json({ success: true, data: docToObjWithCategory(product) });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/products/:id
app.get('/api/products/:id', async (req, res) => {
  try {
    await connectDB();
    const product = await Product.findById(req.params.id).populate('categoryId', 'name slug');
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: docToObjWithCategory(product) });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

// PUT /api/products/:id (admin)
app.put('/api/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const updateData = req.body;
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.salePrice) updateData.salePrice = parseFloat(updateData.salePrice);
    if (updateData.stock) updateData.stock = parseInt(updateData.stock);
    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).populate('categoryId', 'name slug');
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: docToObjWithCategory(product) });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id (admin) - with cascade
app.delete('/api/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const [reviewsResult, cartResult, wishlistResult, recentlyResult, orderItemsResult] = await Promise.all([
      Review.deleteMany({ productId: req.params.id }),
      CartItem.deleteMany({ productId: req.params.id }),
      WishlistItem.deleteMany({ productId: req.params.id }),
      RecentlyViewed.deleteMany({ productId: req.params.id }),
      OrderItem.updateMany({ productId: req.params.id }, { $set: { productId: null } }),
    ]);
    res.json({
      success: true,
      message: 'Product deleted',
      data: {
        deletedReviews: reviewsResult.deletedCount,
        deletedCartItems: cartResult.deletedCount,
        deletedWishlistItems: wishlistResult.deletedCount,
        deletedRecentlyViewed: recentlyResult.deletedCount,
        nullifiedOrderItems: orderItemsResult.modifiedCount,
      },
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

// ==================== CATEGORY ROUTES ====================

// GET /api/categories
app.get('/api/categories', async (req, res) => {
  try {
    await connectDB();
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

// POST /api/categories (admin)
app.post('/api/categories', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
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

// PUT /api/categories/:id (admin)
app.put('/api/categories/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
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

// DELETE /api/categories/:id (admin) - with cascade
app.delete('/api/categories/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    const productsInCategory = await Product.find({ categoryId: req.params.id }).select('_id');
    const productIds = productsInCategory.map(p => p._id);
    if (productIds.length > 0) {
      await Promise.all([
        Review.deleteMany({ productId: { $in: productIds } }),
        CartItem.deleteMany({ productId: { $in: productIds } }),
        WishlistItem.deleteMany({ productId: { $in: productIds } }),
        RecentlyViewed.deleteMany({ productId: { $in: productIds } }),
        OrderItem.updateMany({ productId: { $in: productIds } }, { $set: { productId: null } }),
      ]);
      await Product.deleteMany({ categoryId: req.params.id });
    }
    res.json({
      success: true,
      message: `Category deleted along with ${productIds.length} product(s) and their related data`,
      data: { deletedProducts: productIds.length },
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ==================== CART ROUTES ====================

// GET /api/cart
app.get('/api/cart', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const items = await CartItem.find({ userId: req.user.userId }).populate('productId');
    const cartItems = items.map(item => {
      const obj = docToObjWithProduct(item);
      if (!obj.product && obj.productId) {
        obj.product = { id: obj.productId, name: 'Unknown Product', price: 0, salePrice: null, images: [], stock: 0, brand: null };
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
app.post('/api/cart', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { productId, quantity = 1, size, color } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID is required' });
    }
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
      return res.json({ success: true, data: docToObjWithProduct(existing) });
    }
    const cartItem = await CartItem.create({
      userId: req.user.userId, productId, quantity,
      size: size || undefined, color: color || undefined,
    });
    await cartItem.populate('productId');
    res.status(201).json({ success: true, data: docToObjWithProduct(cartItem) });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/cart/:id
app.put('/api/cart/:id', authMiddleware, async (req, res) => {
  try {
    await connectDB();
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
    res.json({ success: true, data: docToObjWithProduct(cartItem) });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/cart/:id
app.delete('/api/cart/:id', authMiddleware, async (req, res) => {
  try {
    await connectDB();
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

// ==================== WISHLIST ROUTES ====================

// GET /api/wishlist
app.get('/api/wishlist', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const items = await WishlistItem.find({ userId: req.user.userId }).populate('productId');
    const wishlistItems = items.map(item => {
      const obj = docToObjWithProduct(item);
      if (!obj.product && obj.productId) {
        obj.product = { id: obj.productId, name: 'Unknown Product', slug: '', price: 0, salePrice: null, images: [], stock: 0, brand: null, averageRating: 0, totalReviews: 0 };
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
app.post('/api/wishlist', authMiddleware, async (req, res) => {
  try {
    await connectDB();
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
    res.status(201).json({ success: true, data: docToObjWithProduct(wishlistItem) });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/wishlist/:id
app.delete('/api/wishlist/:id', authMiddleware, async (req, res) => {
  try {
    await connectDB();
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

// ==================== REVIEW ROUTES ====================

// GET /api/reviews
app.get('/api/reviews', async (req, res) => {
  try {
    await connectDB();
    const { productId, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (productId) filter.productId = productId;

    const [reviews, total] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).populate('userId', 'name avatar'),
      Review.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        reviews: reviews.map(docToObjWithUser),
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/reviews
app.post('/api/reviews', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { productId, rating, title, comment } = req.body;
    if (!productId || !rating) {
      return res.status(400).json({ success: false, error: 'Product ID and rating are required' });
    }
    const existing = await Review.findOne({ userId: req.user.userId, productId });
    if (existing) {
      return res.status(400).json({ success: false, error: 'You have already reviewed this product' });
    }
    const review = await Review.create({ userId: req.user.userId, productId, rating, title, comment });
    // Update product rating
    const reviews = await Review.find({ productId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await Product.findByIdAndUpdate(productId, {
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews: reviews.length,
    });
    await review.populate('userId', 'name avatar');
    res.status(201).json({ success: true, data: docToObjWithUser(review) });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/reviews/:id
app.delete('/api/reviews/:id', authMiddleware, async (req, res) => {
  try {
    await connectDB();
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

// ==================== ORDER ROUTES ====================

// GET /api/orders
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const skip = (page - 1) * limit;

    const filter = { userId: req.user.userId };
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name email'),
      Order.countDocuments(filter),
    ]);

    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const items = await OrderItem.find({ orderId: order._id });
      const orderObj = docToObjWithUser(order);
      orderObj.items = items.map(itemToObj);
      return orderObj;
    }));

    res.json({
      success: true,
      data: { orders: ordersWithItems, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/orders
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { shippingAddress, paymentMethod = 'cod', couponCode, shippingMethod = 'standard' } = req.body;

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
        productId: product._id, name: product.name, image: product.images[0] || '',
        price, quantity: item.quantity, size: item.size, color: item.color,
      };
    });

    let discount = 0;
    if (couponCode) {
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
          if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
        } else {
          discount = coupon.discount;
        }
        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    let shippingCost;
    switch (shippingMethod) {
      case 'express': shippingCost = 19.99; break;
      case 'international': shippingCost = 24.99; break;
      default: shippingCost = subtotal > 100 ? 0 : 9.99; break;
    }

    const total = subtotal - discount + shippingCost;
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const order = await Order.create({
      userId: req.user.userId, orderNumber, subtotal, shippingCost, discount, total,
      shippingAddress, shippingMethod, paymentMethod,
    });

    for (const itemData of orderItemsData) {
      await OrderItem.create({ orderId: order._id, ...itemData });
    }

    await CartItem.deleteMany({ userId: req.user.userId });
    res.status(201).json({ success: true, data: { orderId: order._id, orderNumber } });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/orders/:id
app.get('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const order = await Order.findById(req.params.id).populate('userId', 'name email');
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    if (req.user.role !== 'admin' && order.userId?._id?.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const items = await OrderItem.find({ orderId: order._id });
    const orderObj = docToObjWithUser(order);
    orderObj.items = items.map(itemToObj);
    res.json({ success: true, data: orderObj });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/orders/:id (admin)
app.put('/api/orders/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { status } = req.body;
    const updateData = { status };
    if (status === 'delivered') updateData.deliveredAt = new Date();
    if (status === 'cancelled') updateData.cancelledAt = new Date();
    const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, data: docToObjWithUser(order) });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/orders/:id (admin)
app.delete('/api/orders/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
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

// ==================== COUPON ROUTES ====================

// GET /api/coupons (admin)
app.get('/api/coupons', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
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

// POST /api/coupons (admin)
app.post('/api/coupons', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
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

// PUT /api/coupons/:id (admin)
app.put('/api/coupons/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ success: false, error: 'Coupon not found' });
    res.json({ success: true, data: docToObj(coupon) });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/coupons/:id (admin)
app.delete('/api/coupons/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, error: 'Coupon not found' });
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/coupons/validate
app.post('/api/coupons/validate', authMiddleware, async (req, res) => {
  try {
    await connectDB();
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

// ==================== DELIVERY METHOD ROUTES ====================

// GET /api/delivery-methods (active only)
app.get('/api/delivery-methods', async (req, res) => {
  try {
    await connectDB();
    const methods = await DeliveryMethod.find({ isActive: true }).sort({ order: 1, price: 1 });
    res.json({ success: true, data: methods.map(docToObj) });
  } catch (error) {
    console.error('Get delivery methods error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch delivery methods' });
  }
});

// POST /api/delivery-methods (admin)
app.post('/api/delivery-methods', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { name, description, price, freeOverAmount, estimatedDays, isActive, order } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, error: 'Name and price are required' });
    }
    const method = await DeliveryMethod.create({
      name, description: description || '', price: parseFloat(price),
      freeOverAmount: freeOverAmount ? parseFloat(freeOverAmount) : undefined,
      estimatedDays: estimatedDays || '', isActive: isActive !== undefined ? isActive : true, order: order || 0,
    });
    res.status(201).json({ success: true, data: docToObj(method) });
  } catch (error) {
    console.error('Create delivery method error:', error);
    res.status(500).json({ success: false, error: 'Failed to create delivery method' });
  }
});

// PUT /api/delivery-methods/:id (admin)
app.put('/api/delivery-methods/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const body = req.body;
    const updateData = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price !== undefined) updateData.price = parseFloat(body.price);
    if (body.freeOverAmount !== undefined) updateData.freeOverAmount = body.freeOverAmount ? parseFloat(body.freeOverAmount) : null;
    if (body.estimatedDays !== undefined) updateData.estimatedDays = body.estimatedDays;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.order !== undefined) updateData.order = parseInt(body.order);
    const method = await DeliveryMethod.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!method) return res.status(404).json({ success: false, error: 'Delivery method not found' });
    res.json({ success: true, data: docToObj(method) });
  } catch (error) {
    console.error('Update delivery method error:', error);
    res.status(500).json({ success: false, error: 'Failed to update delivery method' });
  }
});

// DELETE /api/delivery-methods/:id (admin)
app.delete('/api/delivery-methods/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const method = await DeliveryMethod.findByIdAndDelete(req.params.id);
    if (!method) return res.status(404).json({ success: false, error: 'Delivery method not found' });
    res.json({ success: true, message: 'Delivery method deleted' });
  } catch (error) {
    console.error('Delete delivery method error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete delivery method' });
  }
});

// GET /api/delivery-methods/all (admin, includes inactive)
app.get('/api/delivery-methods/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const methods = await DeliveryMethod.find().sort({ order: 1, price: 1 });
    res.json({ success: true, data: methods.map(docToObj) });
  } catch (error) {
    console.error('Get all delivery methods error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch delivery methods' });
  }
});

// ==================== GIFT CARD ROUTES ====================

// GET /api/gift-cards (active only)
app.get('/api/gift-cards', async (req, res) => {
  try {
    await connectDB();
    const giftCards = await GiftCard.find({ isActive: true }).sort({ price: 1 });
    res.json({ success: true, data: giftCards.map(docToObj) });
  } catch (error) {
    console.error('Get gift cards error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch gift cards' });
  }
});

// POST /api/gift-cards (admin)
app.post('/api/gift-cards', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { name, description, price, salePrice, image, isActive } = req.body;
    if (!name || !price) {
      return res.status(400).json({ success: false, error: 'Name and price are required' });
    }
    const giftCard = await GiftCard.create({
      name, description: description || '', price: parseFloat(price),
      salePrice: salePrice ? parseFloat(salePrice) : undefined,
      image: image || '', isActive: isActive !== undefined ? isActive : true,
    });
    res.status(201).json({ success: true, data: docToObj(giftCard) });
  } catch (error) {
    console.error('Create gift card error:', error);
    res.status(500).json({ success: false, error: 'Failed to create gift card' });
  }
});

// PUT /api/gift-cards/:id (admin)
app.put('/api/gift-cards/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const body = req.body;
    const updateData = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price !== undefined) updateData.price = parseFloat(body.price);
    if (body.salePrice !== undefined) updateData.salePrice = body.salePrice ? parseFloat(body.salePrice) : null;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    const giftCard = await GiftCard.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!giftCard) return res.status(404).json({ success: false, error: 'Gift card not found' });
    res.json({ success: true, data: docToObj(giftCard) });
  } catch (error) {
    console.error('Update gift card error:', error);
    res.status(500).json({ success: false, error: 'Failed to update gift card' });
  }
});

// DELETE /api/gift-cards/:id (admin)
app.delete('/api/gift-cards/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const giftCard = await GiftCard.findByIdAndDelete(req.params.id);
    if (!giftCard) return res.status(404).json({ success: false, error: 'Gift card not found' });
    res.json({ success: true, message: 'Gift card deleted' });
  } catch (error) {
    console.error('Delete gift card error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete gift card' });
  }
});

// GET /api/gift-cards/all (admin, includes inactive)
app.get('/api/gift-cards/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const giftCards = await GiftCard.find().sort({ price: 1 });
    res.json({ success: true, data: giftCards.map(docToObj) });
  } catch (error) {
    console.error('Get all gift cards error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch gift cards' });
  }
});

// ==================== RECENTLY VIEWED ROUTES ====================

// GET /api/recently-viewed
app.get('/api/recently-viewed', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const recentlyViewed = await RecentlyViewed.find({ userId: req.user.userId })
      .populate({ path: 'productId', select: 'name slug price salePrice images brand averageRating totalReviews' })
      .sort({ createdAt: -1 })
      .limit(10);

    const parsedItems = recentlyViewed.map(item => {
      const obj = docToObj(item);
      if (obj.productId && typeof obj.productId === 'object') {
        obj.product = docToObj(obj.productId);
        delete obj.productId;
      }
      return obj;
    });
    res.json({ success: true, data: parsedItems });
  } catch (error) {
    console.error('Get recently viewed error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/recently-viewed
app.post('/api/recently-viewed', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, error: 'Product ID is required' });
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const existing = await RecentlyViewed.findOne({ userId: req.user.userId, productId });
    if (existing) {
      await RecentlyViewed.findByIdAndUpdate(existing._id, { createdAt: new Date() });
    } else {
      await RecentlyViewed.create({ userId: req.user.userId, productId });
    }
    res.json({ success: true, message: 'Product added to recently viewed' });
  } catch (error) {
    console.error('Add recently viewed error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ==================== NEWSLETTER ROUTE ====================

// POST /api/newsletter
app.post('/api/newsletter', async (req, res) => {
  try {
    await connectDB();
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

// ==================== ADMIN ROUTES ====================

// GET /api/admin/stats
app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const [totalUsers, totalProducts, totalOrders] = await Promise.all([
      User.countDocuments(), Product.countDocuments(), Order.countDocuments(),
    ]);
    const totalRevenue = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const statusMap = {};
    ordersByStatus.forEach(item => { statusMap[item._id] = item.count; });

    const monthlySales = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, sales: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } }, { $limit: 12 },
    ]);

    const topProducts = await OrderItem.aggregate([
      { $group: { _id: '$productId', totalSold: { $sum: '$quantity' } } },
      { $sort: { totalSold: -1 } }, { $limit: 5 },
    ]);
    const topProductsWithData = await Promise.all(topProducts.map(async item => {
      const product = await Product.findById(item._id).select('name price images');
      return product ? { ...docToObj(product), totalSold: item.totalSold } : null;
    }));

    res.json({
      success: true,
      data: {
        totalUsers, totalProducts, totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        ordersByStatus: statusMap,
        monthlySales: monthlySales.map(m => ({ month: m._id, sales: m.sales, orders: m.orders })),
        topProducts: topProductsWithData.filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/admin/users
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const search = req.query.search;
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const [users, total] = await Promise.all([
      User.find(filter).select('-password -resetPasswordToken -resetPasswordExpires').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: { users: users.map(docToObjUser), pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id (toggle block)
app.put('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const dbUser = await User.findById(req.params.id);
    if (!dbUser) return res.status(404).json({ success: false, error: 'User not found' });
    dbUser.isBlocked = !dbUser.isBlocked;
    await dbUser.save();
    res.json({ success: true, data: docToObjUser(dbUser) });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id (with cascade)
app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    if (req.user.userId === req.params.id) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }
    const dbUser = await User.findByIdAndDelete(req.params.id);
    if (!dbUser) return res.status(404).json({ success: false, error: 'User not found' });

    const userReviews = await Review.find({ userId: req.params.id }).select('productId');
    const affectedProductIds = [...new Set(userReviews.map(r => r.productId.toString()))];

    const [reviewsResult, cartResult, wishlistResult, recentlyResult, ordersResult] = await Promise.all([
      Review.deleteMany({ userId: req.params.id }),
      CartItem.deleteMany({ userId: req.params.id }),
      WishlistItem.deleteMany({ userId: req.params.id }),
      RecentlyViewed.deleteMany({ userId: req.params.id }),
      Order.updateMany({ userId: req.params.id }, { $set: { userId: null } }),
    ]);

    await Promise.all(affectedProductIds.map(pid => recalculateProductRating(pid)));

    res.json({
      success: true,
      message: 'User deleted',
      data: {
        deletedReviews: reviewsResult.deletedCount,
        deletedCartItems: cartResult.deletedCount,
        deletedWishlistItems: wishlistResult.deletedCount,
        deletedRecentlyViewed: recentlyResult.deletedCount,
        anonymizedOrders: ordersResult.modifiedCount,
        recalculatedProducts: affectedProductIds.length,
      },
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// GET /api/admin/orders
app.get('/api/admin/orders', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const status = req.query.status;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name email'),
      Order.countDocuments(filter),
    ]);

    const ordersData = orders.map(o => {
      const obj = o.toObject ? o.toObject() : o;
      const { _id, __v, ...rest } = obj;
      const result = { id: _id.toString(), ...rest };
      if (result.userId && typeof result.userId === 'object') {
        const uid = result.userId._id;
        if (uid) {
          result.user = { id: uid.toString(), name: result.userId.name || 'Unknown', email: result.userId.email || '' };
          result.userId = uid.toString();
        } else {
          result.user = { name: 'Unknown User', email: '' };
          result.userId = null;
        }
      } else if (!result.userId) {
        result.user = { name: 'Deleted User', email: '' };
      }
      result.subtotal = result.subtotal || 0;
      result.shippingCost = result.shippingCost || 0;
      result.discount = result.discount || 0;
      result.total = result.total || 0;
      if (result.deliveredAt) result.deliveredAt = new Date(result.deliveredAt).toISOString();
      if (result.cancelledAt) result.cancelledAt = new Date(result.cancelledAt).toISOString();
      return result;
    });

    res.json({
      success: true,
      data: { orders: ordersData, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error('Get admin orders error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// GET /api/admin/products
app.get('/api/admin/products', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const search = req.query.search;
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('categoryId', 'name slug'),
      Product.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: { products: products.map(docToObjWithCategory), pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error('Get admin products error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/admin/reviews
app.get('/api/admin/reviews', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name email avatar').populate('productId', 'name'),
      Review.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        reviews: reviews.map(r => {
          const obj = r.toObject();
          const { _id, __v, ...rest } = obj;
          const result = { id: _id.toString(), ...rest };
          if (result.userId && typeof result.userId === 'object' && result.userId._id) {
            const { _id: uid, password, ...userData } = result.userId;
            result.user = { id: uid.toString(), ...userData };
            result.userId = uid.toString();
          }
          if (result.productId && typeof result.productId === 'object' && result.productId._id) {
            const { _id: pid, ...productData } = result.productId;
            result.product = { id: pid.toString(), ...productData };
            result.productId = pid.toString();
          }
          return result;
        }),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('Get admin reviews error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/admin/reviews/:id
app.delete('/api/admin/reviews/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ success: false, error: 'Review not found' });
    await recalculateProductRating(review.productId.toString());
    res.json({ success: true, message: 'Review deleted', data: { productId: review.productId.toString() } });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete review' });
  }
});

// ==================== SEED ROUTE ====================

app.post('/api/seed', async (req, res) => {
  try {
    await connectDB();

    await Promise.all([
      OrderItem.deleteMany({}), Order.deleteMany({}), CartItem.deleteMany({}),
      WishlistItem.deleteMany({}), RecentlyViewed.deleteMany({}), Review.deleteMany({}),
      Product.deleteMany({}), Category.deleteMany({}), Newsletter.deleteMany({}),
      Coupon.deleteMany({}), User.deleteMany({}),
      GiftCard.deleteMany({}), DeliveryMethod.deleteMany({}),
    ]);

    await DeliveryMethod.create([
      { name: 'Standard Shipping', description: 'Reliable ground shipping', price: 9.99, freeOverAmount: 100, estimatedDays: '3-5 business days', isActive: true, order: 0 },
      { name: 'Express Shipping', description: 'Fast delivery for urgent orders', price: 19.99, estimatedDays: '1-2 business days', isActive: true, order: 1 },
      { name: 'International Shipping', description: 'Worldwide delivery. Rates vary by destination.', price: 24.99, estimatedDays: '7-14 business days', isActive: true, order: 2 },
    ]);

    await GiftCard.create([
      { name: '$25 Gift Card', description: 'Perfect for a small treat', price: 25, isActive: true },
      { name: '$50 Gift Card', description: 'A thoughtful gift for any occasion', price: 50, salePrice: 45, isActive: true },
      { name: '$100 Gift Card', description: 'Give the gift of choice', price: 100, salePrice: 90, isActive: true },
      { name: '$200 Gift Card', description: 'The ultimate gift for fashion lovers', price: 200, salePrice: 175, isActive: true },
    ]);

    const menCategory = await Category.create({ name: 'Men', slug: 'men', description: "Men's clothing and accessories" });
    const womenCategory = await Category.create({ name: 'Women', slug: 'women', description: "Women's clothing and accessories" });
    const kidsCategory = await Category.create({ name: 'Kids', slug: 'kids', description: "Kids' clothing and accessories" });
    const shoesCategory = await Category.create({ name: 'Shoes', slug: 'shoes', description: 'Footwear for all' });
    const accessoriesCategory = await Category.create({ name: 'Accessories', slug: 'accessories', description: 'Fashion accessories' });

    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await User.create({
      email: 'admin@example.com', name: 'Admin User', password: adminPassword, role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    });

    const userNames = ['John Smith', 'Emma Wilson', 'Michael Brown', 'Sarah Davis', 'James Johnson', 'Olivia Martinez', 'William Anderson', 'Sophia Taylor', 'Benjamin Thomas', 'Isabella Garcia', 'Lucas Rodriguez', 'Mia Lopez', 'Henry Lee', 'Charlotte Harris', 'Alexander Clark', 'Amelia Lewis', 'Daniel Walker', 'Harper Hall', 'Matthew Allen', 'Evelyn Young'];
    const users = [];
    for (let i = 0; i < userNames.length; i++) {
      const password = await bcrypt.hash('password123', 12);
      const user = await User.create({ email: `user${i + 1}@example.com`, name: userNames[i], password, avatar: `https://i.pravatar.cc/150?u=${i + 1}` });
      users.push(user);
    }

    const menProducts = [
      { name: 'Classic Oxford Shirt', brand: 'Heritage', price: 89.99, salePrice: 69.99, sizes: ['S', 'M', 'L', 'XL'], colors: ['White', 'Blue', 'Pink'], images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80', 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80'], stock: 150, isFeatured: true, isBestSeller: true },
      { name: 'Slim Fit Blazer', brand: 'Modern Tailor', price: 199.99, salePrice: null, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['Navy', 'Charcoal', 'Black'], images: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80', 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80'], stock: 80, isFeatured: true, isNewArrival: true },
      { name: 'Casual Polo T-Shirt', brand: 'Urban Style', price: 45.00, salePrice: 35.00, sizes: ['S', 'M', 'L', 'XL'], colors: ['White', 'Black', 'Red'], images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80'], stock: 200, isBestSeller: true, isTrending: true },
      { name: 'Denim Jacket', brand: 'Rugged Wear', price: 129.99, salePrice: 99.99, sizes: ['S', 'M', 'L', 'XL'], colors: ['Blue', 'Black', 'Light Wash'], images: ['https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80'], stock: 60, isTrending: true },
      { name: 'Formal Dress Pants', brand: 'Executive', price: 79.99, salePrice: null, sizes: ['28', '30', '32', '34', '36'], colors: ['Black', 'Navy', 'Gray'], images: ['https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80'], stock: 120, isFeatured: true },
      { name: 'Graphic Print Hoodie', brand: 'Street King', price: 69.99, salePrice: 54.99, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['Black', 'Gray', 'Navy'], images: ['https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80', 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80'], stock: 180, isFlashSale: true, flashSaleEnds: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
      { name: 'Linen Summer Shirt', brand: 'Coastal Breeze', price: 59.99, salePrice: 44.99, sizes: ['S', 'M', 'L', 'XL'], colors: ['White', 'Sky Blue', 'Beige'], images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80'], stock: 90, isNewArrival: true },
      { name: 'Cashmere Sweater', brand: 'Luxe Knit', price: 159.99, salePrice: null, sizes: ['S', 'M', 'L', 'XL'], colors: ['Camel', 'Black', 'Burgundy'], images: ['https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80', 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80'], stock: 45, isFeatured: true, isNewArrival: true },
      { name: 'Chino Shorts', brand: 'Weekend Warrior', price: 49.99, salePrice: 39.99, sizes: ['28', '30', '32', '34', '36'], colors: ['Khaki', 'Navy', 'Olive'], images: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80', 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80'], stock: 160, isBestSeller: true },
      { name: 'Wool Overcoat', brand: 'Heritage', price: 299.99, salePrice: 249.99, sizes: ['S', 'M', 'L', 'XL'], colors: ['Camel', 'Black', 'Gray'], images: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80', 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80'], stock: 35, isTrending: true, isFeatured: true },
      { name: 'V-Neck T-Shirt Pack', brand: 'Essential', price: 35.00, salePrice: 28.00, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['White', 'Black', 'Gray'], images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80'], stock: 300, isBestSeller: true },
    ];

    const womenProducts = [
      { name: 'Silk Wrap Dress', brand: 'Elegance', price: 159.99, salePrice: 119.99, sizes: ['XS', 'S', 'M', 'L'], colors: ['Floral', 'Black', 'Burgundy'], images: ['https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80'], stock: 70, isFeatured: true, isBestSeller: true },
      { name: 'High-Waist Skinny Jeans', brand: 'Curve', price: 79.99, salePrice: null, sizes: ['24', '26', '28', '30', '32'], colors: ['Dark Blue', 'Black', 'Light Wash'], images: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80'], stock: 150, isTrending: true },
      { name: 'Blouse with Ruffle Details', brand: 'Feminine Touch', price: 69.99, salePrice: 54.99, sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['White', 'Pink', 'Navy'], images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80'], stock: 110, isNewArrival: true },
      { name: 'Cashmere Cardigan', brand: 'Luxe Knit', price: 189.99, salePrice: 149.99, sizes: ['S', 'M', 'L'], colors: ['Cream', 'Blush', 'Gray'], images: ['https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80'], stock: 55, isFeatured: true },
      { name: 'A-Line Midi Skirt', brand: 'Vintage Rose', price: 69.99, salePrice: null, sizes: ['XS', 'S', 'M', 'L'], colors: ['Black', 'Navy', 'Forest Green'], images: ['https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800&q=80', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80'], stock: 85, isBestSeller: true },
      { name: 'Tailored Blazer', brand: 'Power Suite', price: 179.99, salePrice: 139.99, sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['Black', 'Navy', 'Camel'], images: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80'], stock: 65, isNewArrival: true, isTrending: true },
      { name: 'Floral Maxi Dress', brand: 'Garden Party', price: 129.99, salePrice: 99.99, sizes: ['XS', 'S', 'M', 'L'], colors: ['Floral Print', 'Blue Floral', 'Pink Floral'], images: ['https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80', 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800&q=80'], stock: 75, isFlashSale: true, flashSaleEnds: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
      { name: 'Cropped Denim Jacket', brand: 'Urban Chic', price: 99.99, salePrice: null, sizes: ['XS', 'S', 'M', 'L'], colors: ['Blue', 'White', 'Black'], images: ['https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80'], stock: 95, isBestSeller: true },
      { name: 'Satin Camisole Top', brand: 'Night & Day', price: 45.00, salePrice: 35.00, sizes: ['XS', 'S', 'M', 'L'], colors: ['Champagne', 'Black', 'Ivory'], images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80'], stock: 130, isTrending: true },
      { name: 'Wide-Leg Palazzo Pants', brand: 'Seventies Revival', price: 89.99, salePrice: 69.99, sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['Black', 'White', 'Tan'], images: ['https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800&q=80', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80'], stock: 80, isFeatured: true, isNewArrival: true },
      { name: 'Turtleneck Sweater', brand: 'Cozy Knits', price: 75.00, salePrice: 59.00, sizes: ['S', 'M', 'L', 'XL'], colors: ['Cream', 'Olive', 'Wine'], images: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80'], stock: 100, isBestSeller: true },
    ];

    const kidsProducts = [
      { name: 'Fun Print T-Shirt', brand: 'Little Stars', price: 24.99, salePrice: 19.99, sizes: ['2T', '3T', '4T', '5T'], colors: ['Red', 'Blue', 'Yellow'], images: ['https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80', 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80'], stock: 200, isFeatured: true },
      { name: 'Denim Overalls', brand: 'Playtime', price: 39.99, salePrice: null, sizes: ['2T', '3T', '4T', '5T', '6'], colors: ['Blue', 'Light Wash'], images: ['https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80', 'https://images.unsplash.com/photo-1471286314838-497ccaa7639d?w=800&q=80'], stock: 120, isBestSeller: true },
      { name: 'Rainbow Hoodie', brand: 'Happy Kids', price: 34.99, salePrice: 27.99, sizes: ['4', '5', '6', '7', '8'], colors: ['Rainbow', 'Pink', 'Blue'], images: ['https://images.unsplash.com/photo-1471286314838-497ccaa7639d?w=800&q=80', 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80'], stock: 150, isNewArrival: true, isTrending: true },
      { name: 'Summer Shorts Set', brand: 'Sunny Days', price: 29.99, salePrice: 22.99, sizes: ['2T', '3T', '4T', '5T'], colors: ['Green', 'Orange', 'Blue'], images: ['https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80', 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80', 'https://images.unsplash.com/photo-1471286314838-497ccaa7639d?w=800&q=80'], stock: 180, isFlashSale: true, flashSaleEnds: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
      { name: 'Cozy Pajama Set', brand: 'Dreamland', price: 32.99, salePrice: null, sizes: ['2T', '3T', '4T', '5T', '6'], colors: ['Stars', 'Dinosaurs', 'Unicorns'], images: ['https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80', 'https://images.unsplash.com/photo-1471286314838-497ccaa7639d?w=800&q=80'], stock: 100, isFeatured: true },
      { name: 'Athletic Joggers', brand: 'Active Kids', price: 27.99, salePrice: 21.99, sizes: ['4', '5', '6', '7', '8'], colors: ['Black', 'Navy', 'Gray'], images: ['https://images.unsplash.com/photo-1471286314838-497ccaa7639d?w=800&q=80', 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80'], stock: 140, isBestSeller: true },
    ];

    const shoesProducts = [
      { name: 'Classic Running Shoes', brand: 'SprintPro', price: 119.99, salePrice: 89.99, sizes: ['7', '8', '9', '10', '11', '12'], colors: ['Black/White', 'Navy/Red', 'Gray/Green'], images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80'], stock: 200, isFeatured: true, isBestSeller: true, isTrending: true },
      { name: 'Leather Chelsea Boots', brand: 'Heritage', price: 179.99, salePrice: null, sizes: ['7', '8', '9', '10', '11', '12'], colors: ['Brown', 'Black', 'Tan'], images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80', 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80'], stock: 80, isFeatured: true },
      { name: 'White Sneakers', brand: 'Clean Kicks', price: 89.99, salePrice: 69.99, sizes: ['6', '7', '8', '9', '10', '11'], colors: ['White', 'Off-White', 'White/Gum'], images: ['https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'], stock: 250, isBestSeller: true },
      { name: 'Hiking Trail Boots', brand: 'Mountain Peak', price: 149.99, salePrice: 119.99, sizes: ['7', '8', '9', '10', '11', '12'], colors: ['Olive/Tan', 'Black/Gray', 'Brown'], images: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80'], stock: 60, isNewArrival: true },
      { name: 'Slip-On Loafers', brand: 'Comfort Plus', price: 79.99, salePrice: null, sizes: ['7', '8', '9', '10', '11'], colors: ['Navy', 'Brown', 'Black'], images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80', 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'], stock: 130, isTrending: true },
      { name: 'Basketball High-Tops', brand: 'Court King', price: 139.99, salePrice: 109.99, sizes: ['8', '9', '10', '11', '12', '13'], colors: ['Red/Black', 'Blue/White', 'Black/Gold'], images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80'], stock: 90, isFlashSale: true, flashSaleEnds: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) },
      { name: 'Canvas Slip-Ons', brand: 'Beach Life', price: 49.99, salePrice: 39.99, sizes: ['6', '7', '8', '9', '10', '11'], colors: ['Navy', 'Red', 'Black', 'White'], images: ['https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80'], stock: 180, isBestSeller: true },
      { name: 'Formal Oxford Shoes', brand: 'Gentleman', price: 199.99, salePrice: null, sizes: ['7', '8', '9', '10', '11', '12'], colors: ['Black', 'Brown', 'Oxblood'], images: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'], stock: 50, isFeatured: true, isNewArrival: true },
    ];

    const accessoriesProducts = [
      { name: 'Leather Crossbody Bag', brand: 'Artisan', price: 89.99, salePrice: 69.99, sizes: ['One Size'], colors: ['Brown', 'Black', 'Tan'], images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80'], stock: 100, isFeatured: true, isBestSeller: true },
      { name: 'Aviator Sunglasses', brand: 'Shade Master', price: 149.99, salePrice: null, sizes: ['One Size'], colors: ['Gold/Green', 'Silver/Blue', 'Black/Gray'], images: ['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80', 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80'], stock: 120, isTrending: true },
      { name: 'Minimalist Watch', brand: 'Timeless', price: 199.99, salePrice: 159.99, sizes: ['One Size'], colors: ['Silver/White', 'Gold/Black', 'Rose Gold/Pink'], images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80'], stock: 70, isFeatured: true, isNewArrival: true },
      { name: 'Wool Scarf', brand: 'Winter Luxe', price: 49.99, salePrice: 39.99, sizes: ['One Size'], colors: ['Camel', 'Charcoal', 'Burgundy', 'Forest Green'], images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80'], stock: 150, isBestSeller: true },
      { name: 'Leather Belt', brand: 'Heritage', price: 59.99, salePrice: null, sizes: ['S', 'M', 'L', 'XL'], colors: ['Brown', 'Black', 'Tan'], images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80'], stock: 200, isFlashSale: true, flashSaleEnds: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000) },
      { name: 'Silk Tie Set', brand: 'Gentleman', price: 45.00, salePrice: 35.00, sizes: ['One Size'], colors: ['Navy', 'Burgundy', 'Gray', 'Striped'], images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80'], stock: 90, isNewArrival: true },
      { name: 'Canvas Tote Bag', brand: 'Eco Chic', price: 34.99, salePrice: 27.99, sizes: ['One Size'], colors: ['Natural', 'Black', 'Olive'], images: ['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80', 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80'], stock: 180, isBestSeller: true, isTrending: true },
      { name: 'Diamond Stud Earrings', brand: 'Sparkle', price: 299.99, salePrice: 249.99, sizes: ['One Size'], colors: ['Silver', 'Gold', 'Rose Gold'], images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80'], stock: 40, isFeatured: true },
    ];

    const allProductData = [
      ...menProducts.map(p => ({ ...p, categoryId: menCategory._id, category: 'Men' })),
      ...womenProducts.map(p => ({ ...p, categoryId: womenCategory._id, category: 'Women' })),
      ...kidsProducts.map(p => ({ ...p, categoryId: kidsCategory._id, category: 'Kids' })),
      ...shoesProducts.map(p => ({ ...p, categoryId: shoesCategory._id, category: 'Shoes' })),
      ...accessoriesProducts.map(p => ({ ...p, categoryId: accessoriesCategory._id, category: 'Accessories' })),
    ];

    const products = [];
    for (const pData of allProductData) {
      const slug = pData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const sku = `${pData.brand.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const product = await Product.create({
        name: pData.name, slug, description: `${pData.name} by ${pData.brand}. Premium quality ${pData.category.toLowerCase()} fashion crafted with care.`,
        brand: pData.brand, price: pData.price, salePrice: pData.salePrice || undefined, sku,
        stock: pData.stock, sizes: pData.sizes, colors: pData.colors, images: pData.images,
        categoryId: pData.categoryId, category: pData.category,
        isFeatured: pData.isFeatured || false, isNewArrival: pData.isNewArrival || false,
        isBestSeller: pData.isBestSeller || false, isTrending: pData.isTrending || false,
        isFlashSale: pData.isFlashSale || false, flashSaleEnds: pData.flashSaleEnds || undefined,
      });
      products.push(product);
    }

    // Create Reviews
    const reviewTitles = ['Great quality!', 'Love it', 'Good value', 'Impressive', 'Would buy again', 'Perfect fit', 'Beautiful design', 'Comfortable', 'Exactly as described', 'Amazing quality', 'Stunning piece', 'Worth every penny'];
    const reviewComments = ['The quality is outstanding, exactly what I was looking for.', 'Really impressed with this purchase.', 'Good value for the price. Would definitely recommend.', 'This exceeded my expectations in every way.', "I've been wearing this for a month now and it still looks brand new.", 'Perfect for everyday wear.', 'Got so many compliments.', 'The fabric is soft and breathable.', 'Shipping was fast.', 'They never disappoint.'];
    let reviewCount = 0;
    const createdReviewPairs = new Set();
    for (let i = 0; i < 200 && reviewCount < 120; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      const pairKey = `${randomUser._id}-${randomProduct._id}`;
      if (!createdReviewPairs.has(pairKey)) {
        createdReviewPairs.add(pairKey);
        const rating = Math.floor(Math.random() * 3) + 3;
        await Review.create({
          userId: randomUser._id, productId: randomProduct._id, rating,
          title: reviewTitles[Math.floor(Math.random() * reviewTitles.length)],
          comment: reviewComments[Math.floor(Math.random() * reviewComments.length)],
        });
        reviewCount++;
      }
    }

    for (const product of products) {
      const reviews = await Review.find({ productId: product._id }).select('rating');
      if (reviews.length > 0) {
        const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        await Product.findByIdAndUpdate(product._id, { averageRating: Math.round(averageRating * 10) / 10, totalReviews: reviews.length });
      }
    }

    // Create Orders
    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    let orderCount = 0;
    for (let i = 0; i < 50 && orderCount < 35; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const numItems = Math.floor(Math.random() * 3) + 1;
      const orderProducts = [];
      const usedProductIds = new Set();
      for (let j = 0; j < numItems; j++) {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        if (!usedProductIds.has(randomProduct._id.toString())) {
          usedProductIds.add(randomProduct._id.toString());
          orderProducts.push({ product: randomProduct, quantity: Math.floor(Math.random() * 3) + 1, size: randomProduct.sizes[Math.floor(Math.random() * randomProduct.sizes.length)] || null, color: randomProduct.colors[Math.floor(Math.random() * randomProduct.colors.length)] || null });
        }
      }
      if (orderProducts.length === 0) continue;
      let subtotal = 0;
      const orderItemsData = orderProducts.map(item => {
        const price = item.product.salePrice || item.product.price;
        subtotal += price * item.quantity;
        return { productId: item.product._id, name: item.product.name, image: item.product.images[0] || '', price, quantity: item.quantity, size: item.size, color: item.color };
      });
      const shippingCost = subtotal > 100 ? 0 : 10;
      const total = subtotal + shippingCost;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const shippingAddress = { firstName: randomUser.name.split(' ')[0], lastName: randomUser.name.split(' ')[1] || '', street: `${Math.floor(Math.random() * 9999) + 1} Main Street`, city: 'New York', state: 'NY', zipCode: '10001', country: 'US' };
      const order = await Order.create({
        userId: randomUser._id, orderNumber, status, subtotal, shippingCost, discount: 0, total,
        shippingAddress, paymentMethod: Math.random() > 0.5 ? 'cod' : 'stripe',
        deliveredAt: status === 'delivered' ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined,
        cancelledAt: status === 'cancelled' ? new Date() : undefined,
        createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      });
      for (const itemData of orderItemsData) {
        await OrderItem.create({ orderId: order._id, ...itemData });
      }
      orderCount++;
    }

    await Coupon.create([
      { code: 'WELCOME10', discount: 10, discountType: 'percentage', minPurchase: 50, maxDiscount: 50, usageLimit: 100, isActive: true, expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
      { code: 'SUMMER25', discount: 25, discountType: 'percentage', minPurchase: 100, maxDiscount: 100, usageLimit: 50, isActive: true, expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
      { code: 'FLAT20', discount: 20, discountType: 'fixed', minPurchase: 100, usageLimit: 200, isActive: true, expiresAt: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000) },
      { code: 'FIRSTORDER', discount: 15, discountType: 'percentage', maxDiscount: 75, usageLimit: 500, isActive: true, expiresAt: undefined },
      { code: 'VIP50', discount: 50, discountType: 'fixed', minPurchase: 200, usageLimit: 10, isActive: true, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      { code: 'EXPIRED10', discount: 10, discountType: 'percentage', isActive: false, expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
    ]);

    res.json({
      success: true, message: 'Database seeded successfully',
      data: { categories: 5, products: products.length, users: users.length + 1, reviews: reviewCount, orders: orderCount, coupons: 6 },
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api', (req, res) => {
  res.json({ success: true, message: 'LUXE E-Commerce API', version: '1.0.0' });
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

// Start server - bind to 127.0.0.1 instead of ::
app.listen(PORT, '127.0.0.1', async () => {
  console.log(`LUXE Backend running on port ${PORT}`);
  try {
    await connectDB();
  } catch (err) {
    console.error('Initial DB connection failed:', err);
  }
});
