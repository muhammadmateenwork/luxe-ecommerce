import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import {
  Product, Category, User, Review, CartItem, WishlistItem,
  Order, OrderItem, Coupon, Newsletter, RecentlyViewed,
  GiftCard, DeliveryMethod,
} from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'luxe-ecommerce-jwt-secret-key-2024-production';

// ==================== HELPER FUNCTIONS ====================

function docToObj(doc: any): any {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  return { id: _id.toString(), ...rest };
}

function docToObjUser(doc: any): any {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, password, resetPasswordToken, resetPasswordExpires, ...rest } = obj;
  return { id: _id.toString(), ...rest };
}

function docToObjWithProduct(doc: any): any {
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

function docToObjWithCategory(doc: any): any {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  const result = { id: _id.toString(), ...rest };
  if (result.categoryId && typeof result.categoryId === 'object' && result.categoryId._id) {
    result.categoryId = docToObj(result.categoryId);
  }
  return result;
}

function docToObjWithUser(doc: any): any {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  const result = { id: _id.toString(), ...rest };
  if (result.userId && typeof result.userId === 'object' && result.userId._id) {
    const { _id: uid, password, ...userData } = result.userId.toObject ? result.userId.toObject() : result.userId;
    result.user = { id: uid.toString(), ...userData };
    result.userId = uid.toString();
  }
  return result;
}

function itemToObj(item: any): any {
  const obj = item.toObject ? item.toObject() : item;
  const { _id, __v, ...rest } = obj;
  return { id: _id.toString(), ...rest };
}

async function recalculateProductRating(productId: string) {
  const stats = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg = stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;
  const total = stats.length > 0 ? stats[0].count : 0;
  await Product.findByIdAndUpdate(productId, { averageRating: avg, totalReviews: total });
}

// ==================== AUTH HELPERS ====================

function getAuthUser(request: NextRequest): { userId: string; email: string; role: string } | null {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

function requireAuth(request: NextRequest): { userId: string; email: string; role: string } | NextResponse {
  const user = getAuthUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }
  return user;
}

function requireAdmin(request: NextRequest): { userId: string; email: string; role: string } | NextResponse {
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  if (authResult.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }
  return authResult;
}

// ==================== JSON HELPER ====================

async function getRequestBody(request: NextRequest): Promise<any> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// ==================== ROUTE HANDLER ====================

async function handleRequest(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;
  const searchParams = url.searchParams;

  // Parse path segments after /api/
  const apiPath = pathname.replace(/^\/api\/?/, '');
  const segments = apiPath.split('/').filter(Boolean);

  // GET /api - health check
  if (segments.length === 0 && method === 'GET') {
    return NextResponse.json({ success: true, message: 'LUXE E-Commerce API', version: '1.0.0' });
  }

  try {
    // ==================== AUTH ROUTES ====================
    if (segments[0] === 'auth') {
      // POST /api/auth/register
      if (segments[1] === 'register' && method === 'POST') {
        await connectDB();
        const body = await getRequestBody(request);
        const { name, email, password } = body || {};
        if (!name || !email || !password) {
          return NextResponse.json({ success: false, error: 'Name, email, and password are required' }, { status: 400 });
        }
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
          return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 400 });
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
        return NextResponse.json({ success: true, data: { user: docToObjUser(user), token } }, { status: 201 });
      }

      // POST /api/auth/login
      if (segments[1] === 'login' && method === 'POST') {
        await connectDB();
        const body = await getRequestBody(request);
        const { email, password } = body || {};
        if (!email || !password) {
          return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
        }
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
          return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
        }
        if (user.isBlocked) {
          return NextResponse.json({ success: false, error: 'Your account has been blocked' }, { status: 403 });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
        }
        const token = jwt.sign(
          { userId: user._id.toString(), email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        return NextResponse.json({ success: true, data: { user: docToObjUser(user), token } });
      }

      // POST /api/auth/logout
      if (segments[1] === 'logout' && method === 'POST') {
        return NextResponse.json({ success: true, message: 'Logged out successfully' });
      }

      // GET /api/auth/me
      if (segments[1] === 'me' && method === 'GET') {
        const authResult = requireAuth(request);
        if (authResult instanceof NextResponse) return authResult;
        await connectDB();
        const dbUser = await User.findById(authResult.userId);
        if (!dbUser) {
          return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: docToObjUser(dbUser) });
      }

      // POST /api/auth/forgot-password
      if (segments[1] === 'forgot-password' && method === 'POST') {
        const body = await getRequestBody(request);
        const { email } = body || {};
        if (!email) {
          return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
        }
        const resetToken = jwt.sign({ email, purpose: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
        return NextResponse.json({ success: true, message: 'Password reset email sent', resetToken });
      }

      // POST /api/auth/reset-password
      if (segments[1] === 'reset-password' && method === 'POST') {
        await connectDB();
        const body = await getRequestBody(request);
        const { token, newPassword } = body || {};
        if (!token || !newPassword) {
          return NextResponse.json({ success: false, error: 'Token and new password are required' }, { status: 400 });
        }
        let decoded;
        try {
          decoded = jwt.verify(token, JWT_SECRET) as any;
        } catch {
          return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 400 });
        }
        const user = await User.findOne({ email: decoded.email });
        if (!user) {
          return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();
        return NextResponse.json({ success: true, message: 'Password reset successfully' });
      }
    }

    // ==================== PRODUCT ROUTES ====================
    if (segments[0] === 'products') {
      // GET /api/products
      if (segments.length === 1 && method === 'GET') {
        await connectDB();
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');
        const sizes = searchParams.get('sizes');
        const colors = searchParams.get('colors');
        const rating = searchParams.get('rating');
        const sort = searchParams.get('sort') || 'newest';
        const page = searchParams.get('page') || '1';
        const limit = searchParams.get('limit') || '12';
        const featured = searchParams.get('featured');
        const newArrival = searchParams.get('newArrival');
        const bestSeller = searchParams.get('bestSeller');
        const trending = searchParams.get('trending');
        const flashSale = searchParams.get('flashSale');
        const onSale = searchParams.get('onSale');

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const filter: any = {};
        if (category) filter.category = category;
        if (search) {
          filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { brand: { $regex: search, $options: 'i' } },
          ];
        }
        if (minPrice || maxPrice) {
          const priceFilter: any = {};
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
        if (sizes) filter.sizes = { $in: sizes.split(',').map((s: string) => s.trim()) };
        if (colors) filter.colors = { $in: colors.split(',').map((c: string) => c.trim()) };
        if (rating) filter.averageRating = { $gte: parseFloat(rating) };

        let sortObj: any = {};
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

        let flashSaleEndsAt: string | null = null;
        if (flashSale === 'true' && products.length > 0) {
          const earliestProduct = products.reduce((earliest: any, p: any) => {
            const pEnd = p.flashSaleEnds ? new Date(p.flashSaleEnds).getTime() : Infinity;
            const eEnd = earliest ? (earliest.flashSaleEnds ? new Date(earliest.flashSaleEnds).getTime() : Infinity) : Infinity;
            return pEnd < eEnd ? p : earliest;
          }, products[0]);
          if (earliestProduct?.flashSaleEnds) {
            flashSaleEndsAt = new Date(earliestProduct.flashSaleEnds).toISOString();
          }
        }

        const responseData: any = {
          products: products.map(docToObjWithCategory),
          pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
        };
        if (flashSaleEndsAt) responseData.flashSaleEndsAt = flashSaleEndsAt;

        return NextResponse.json({ success: true, data: responseData });
      }

      // POST /api/products (admin)
      if (segments.length === 1 && method === 'POST') {
        const adminResult = requireAdmin(request);
        if (adminResult instanceof NextResponse) return adminResult;
        await connectDB();
        const body = await getRequestBody(request);
        const { name, slug, description, brand, price, salePrice, sku, stock, sizes, colors, images, categoryId, category, isFeatured, isNewArrival, isBestSeller, isTrending, isFlashSale, flashSaleEnds } = body || {};
        if (!name || !slug || !description || !brand || !price || !sku || !categoryId || !category) {
          return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }
        const existing = await Product.findOne({ $or: [{ slug }, { sku }] });
        if (existing) {
          return NextResponse.json({ success: false, error: 'Product with this slug or SKU already exists' }, { status: 400 });
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
        return NextResponse.json({ success: true, data: docToObjWithCategory(product) }, { status: 201 });
      }

      // Routes with :id
      if (segments.length === 2) {
        const id = segments[1];

        // GET /api/products/:id
        if (method === 'GET') {
          await connectDB();
          const product = await Product.findById(id).populate('categoryId', 'name slug');
          if (!product) {
            return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
          }
          return NextResponse.json({ success: true, data: docToObjWithCategory(product) });
        }

        // PUT /api/products/:id (admin)
        if (method === 'PUT') {
          const adminResult = requireAdmin(request);
          if (adminResult instanceof NextResponse) return adminResult;
          await connectDB();
          const updateData = await getRequestBody(request);
          if (updateData.price) updateData.price = parseFloat(updateData.price);
          if (updateData.salePrice) updateData.salePrice = parseFloat(updateData.salePrice);
          if (updateData.stock) updateData.stock = parseInt(updateData.stock);
          const product = await Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('categoryId', 'name slug');
          if (!product) {
            return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
          }
          return NextResponse.json({ success: true, data: docToObjWithCategory(product) });
        }

        // DELETE /api/products/:id (admin)
        if (method === 'DELETE') {
          const adminResult = requireAdmin(request);
          if (adminResult instanceof NextResponse) return adminResult;
          await connectDB();
          const product = await Product.findByIdAndDelete(id);
          if (!product) {
            return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
          }
          const [reviewsResult, cartResult, wishlistResult, recentlyResult, orderItemsResult] = await Promise.all([
            Review.deleteMany({ productId: id }),
            CartItem.deleteMany({ productId: id }),
            WishlistItem.deleteMany({ productId: id }),
            RecentlyViewed.deleteMany({ productId: id }),
            OrderItem.updateMany({ productId: id }, { $set: { productId: null } }),
          ]);
          return NextResponse.json({
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
        }
      }
    }

    // ==================== CATEGORY ROUTES ====================
    if (segments[0] === 'categories') {
      // GET /api/categories
      if (segments.length === 1 && method === 'GET') {
        await connectDB();
        const categories = await Category.find().sort({ name: 1 });
        const categoriesWithCount = await Promise.all(categories.map(async (cat: any) => {
          const productCount = await Product.countDocuments({ categoryId: cat._id });
          return { ...docToObj(cat), _count: { products: productCount } };
        }));
        return NextResponse.json({ success: true, data: categoriesWithCount });
      }

      // POST /api/categories (admin)
      if (segments.length === 1 && method === 'POST') {
        const adminResult = requireAdmin(request);
        if (adminResult instanceof NextResponse) return adminResult;
        await connectDB();
        const body = await getRequestBody(request);
        const { name, slug, description, image } = body || {};
        if (!name || !slug) {
          return NextResponse.json({ success: false, error: 'Name and slug are required' }, { status: 400 });
        }
        try {
          const category = await Category.create({ name, slug, description, image });
          return NextResponse.json({ success: true, data: docToObj(category) }, { status: 201 });
        } catch (error: any) {
          if (error.code === 11000) {
            return NextResponse.json({ success: false, error: 'Category with this name or slug already exists' }, { status: 400 });
          }
          throw error;
        }
      }

      // Routes with :id
      if (segments.length === 2) {
        const id = segments[1];

        // PUT /api/categories/:id (admin)
        if (method === 'PUT') {
          const adminResult = requireAdmin(request);
          if (adminResult instanceof NextResponse) return adminResult;
          await connectDB();
          const body = await getRequestBody(request);
          const category = await Category.findByIdAndUpdate(id, body, { new: true, runValidators: true });
          if (!category) {
            return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
          }
          return NextResponse.json({ success: true, data: docToObj(category) });
        }

        // DELETE /api/categories/:id (admin)
        if (method === 'DELETE') {
          const adminResult = requireAdmin(request);
          if (adminResult instanceof NextResponse) return adminResult;
          await connectDB();
          const category = await Category.findByIdAndDelete(id);
          if (!category) {
            return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
          }
          const productsInCategory = await Product.find({ categoryId: id }).select('_id');
          const productIds = productsInCategory.map((p: any) => p._id);
          if (productIds.length > 0) {
            await Promise.all([
              Review.deleteMany({ productId: { $in: productIds } }),
              CartItem.deleteMany({ productId: { $in: productIds } }),
              WishlistItem.deleteMany({ productId: { $in: productIds } }),
              RecentlyViewed.deleteMany({ productId: { $in: productIds } }),
              OrderItem.updateMany({ productId: { $in: productIds } }, { $set: { productId: null } }),
            ]);
            await Product.deleteMany({ categoryId: id });
          }
          return NextResponse.json({
            success: true,
            message: `Category deleted along with ${productIds.length} product(s) and their related data`,
            data: { deletedProducts: productIds.length },
          });
        }
      }
    }

    // ==================== CART ROUTES ====================
    if (segments[0] === 'cart') {
      // GET /api/cart
      if (segments.length === 1 && method === 'GET') {
        const authResult = requireAuth(request);
        if (authResult instanceof NextResponse) return authResult;
        await connectDB();
        const items = await CartItem.find({ userId: authResult.userId }).populate('productId');
        const cartItems = items.map((item: any) => {
          const obj = docToObjWithProduct(item);
          if (!obj.product && obj.productId) {
            obj.product = { id: obj.productId, name: 'Unknown Product', price: 0, salePrice: null, images: [], stock: 0, brand: null };
          }
          return obj;
        }).filter((item: any) => item.product);
        return NextResponse.json({ success: true, data: cartItems });
      }

      // POST /api/cart
      if (segments.length === 1 && method === 'POST') {
        const authResult = requireAuth(request);
        if (authResult instanceof NextResponse) return authResult;
        await connectDB();
        const body = await getRequestBody(request);
        const { productId, quantity = 1, size, color } = body || {};
        if (!productId) {
          return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
        }
        const existing = await CartItem.findOne({
          userId: authResult.userId,
          productId,
          size: size || null,
          color: color || null,
        });
        if (existing) {
          existing.quantity += quantity;
          await existing.save();
          await existing.populate('productId');
          return NextResponse.json({ success: true, data: docToObjWithProduct(existing) });
        }
        const cartItem = await CartItem.create({
          userId: authResult.userId, productId, quantity,
          size: size || undefined, color: color || undefined,
        });
        await cartItem.populate('productId');
        return NextResponse.json({ success: true, data: docToObjWithProduct(cartItem) }, { status: 201 });
      }

      // Routes with :id
      if (segments.length === 2) {
        const id = segments[1];

        // PUT /api/cart/:id
        if (method === 'PUT') {
          const authResult = requireAuth(request);
          if (authResult instanceof NextResponse) return authResult;
          await connectDB();
          const body = await getRequestBody(request);
          const { quantity } = body || {};
          if (!quantity || quantity < 1) {
            return NextResponse.json({ success: false, error: 'Quantity must be at least 1' }, { status: 400 });
          }
          const cartItem = await CartItem.findOneAndUpdate(
            { _id: id, userId: authResult.userId },
            { quantity },
            { new: true }
          ).populate('productId');
          if (!cartItem) {
            return NextResponse.json({ success: false, error: 'Cart item not found' }, { status: 404 });
          }
          return NextResponse.json({ success: true, data: docToObjWithProduct(cartItem) });
        }

        // DELETE /api/cart/:id
        if (method === 'DELETE') {
          const authResult = requireAuth(request);
          if (authResult instanceof NextResponse) return authResult;
          await connectDB();
          const cartItem = await CartItem.findOneAndDelete({ _id: id, userId: authResult.userId });
          if (!cartItem) {
            return NextResponse.json({ success: false, error: 'Cart item not found' }, { status: 404 });
          }
          return NextResponse.json({ success: true, message: 'Item removed from cart' });
        }
      }
    }

    // ==================== WISHLIST ROUTES ====================
    if (segments[0] === 'wishlist') {
      // GET /api/wishlist
      if (segments.length === 1 && method === 'GET') {
        const authResult = requireAuth(request);
        if (authResult instanceof NextResponse) return authResult;
        await connectDB();
        const items = await WishlistItem.find({ userId: authResult.userId }).populate('productId');
        const wishlistItems = items.map((item: any) => {
          const obj = docToObjWithProduct(item);
          if (!obj.product && obj.productId) {
            obj.product = { id: obj.productId, name: 'Unknown Product', slug: '', price: 0, salePrice: null, images: [], stock: 0, brand: null, averageRating: 0, totalReviews: 0 };
          }
          return obj;
        }).filter((item: any) => item.product);
        return NextResponse.json({ success: true, data: wishlistItems });
      }

      // POST /api/wishlist
      if (segments.length === 1 && method === 'POST') {
        const authResult = requireAuth(request);
        if (authResult instanceof NextResponse) return authResult;
        await connectDB();
        const body = await getRequestBody(request);
        const { productId } = body || {};
        if (!productId) {
          return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
        }
        const existing = await WishlistItem.findOne({ userId: authResult.userId, productId });
        if (existing) {
          return NextResponse.json({ success: false, error: 'Product already in wishlist' }, { status: 400 });
        }
        const wishlistItem = await WishlistItem.create({ userId: authResult.userId, productId });
        await wishlistItem.populate('productId');
        return NextResponse.json({ success: true, data: docToObjWithProduct(wishlistItem) }, { status: 201 });
      }

      // DELETE /api/wishlist/:id
      if (segments.length === 2 && method === 'DELETE') {
        const authResult = requireAuth(request);
        if (authResult instanceof NextResponse) return authResult;
        await connectDB();
        const wishlistItem = await WishlistItem.findOneAndDelete({ _id: segments[1], userId: authResult.userId });
        if (!wishlistItem) {
          return NextResponse.json({ success: false, error: 'Wishlist item not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, message: 'Item removed from wishlist' });
      }
    }

    // ==================== REVIEW ROUTES ====================
    if (segments[0] === 'reviews') {
      // GET /api/reviews
      if (segments.length === 1 && method === 'GET') {
        await connectDB();
        const productId = searchParams.get('productId');
        const page = searchParams.get('page') || '1';
        const limit = searchParams.get('limit') || '10';
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const filter: any = {};
        if (productId) filter.productId = productId;

        const [reviews, total] = await Promise.all([
          Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).populate('userId', 'name avatar'),
          Review.countDocuments(filter),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            reviews: reviews.map(docToObjWithUser),
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
          },
        });
      }

      // POST /api/reviews
      if (segments.length === 1 && method === 'POST') {
        const authResult = requireAuth(request);
        if (authResult instanceof NextResponse) return authResult;
        await connectDB();
        const body = await getRequestBody(request);
        const { productId, rating, title, comment } = body || {};
        if (!productId || !rating) {
          return NextResponse.json({ success: false, error: 'Product ID and rating are required' }, { status: 400 });
        }
        const existing = await Review.findOne({ userId: authResult.userId, productId });
        if (existing) {
          return NextResponse.json({ success: false, error: 'You have already reviewed this product' }, { status: 400 });
        }
        const review = await Review.create({ userId: authResult.userId, productId, rating, title, comment });
        const reviews = await Review.find({ productId });
        const avgRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
        await Product.findByIdAndUpdate(productId, {
          averageRating: Math.round(avgRating * 10) / 10,
          totalReviews: reviews.length,
        });
        await review.populate('userId', 'name avatar');
        return NextResponse.json({ success: true, data: docToObjWithUser(review) }, { status: 201 });
      }

      // DELETE /api/reviews/:id
      if (segments.length === 2 && method === 'DELETE') {
        const authResult = requireAuth(request);
        if (authResult instanceof NextResponse) return authResult;
        await connectDB();
        const review = await Review.findById(segments[1]);
        if (!review) return NextResponse.json({ success: false, error: 'Review not found' }, { status: 404 });
        if (authResult.role !== 'admin' && review.userId.toString() !== authResult.userId) {
          return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }
        const productId = review.productId;
        await Review.findByIdAndDelete(segments[1]);
        const reviews = await Review.find({ productId });
        const avgRating = reviews.length > 0 ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length : 0;
        await Product.findByIdAndUpdate(productId, {
          averageRating: Math.round(avgRating * 10) / 10,
          totalReviews: reviews.length,
        });
        return NextResponse.json({ success: true, message: 'Review deleted' });
      }
    }

    // ==================== ORDER ROUTES ====================
    if (segments[0] === 'orders') {
      // GET /api/orders
      if (segments.length === 1 && method === 'GET') {
        const authResult = requireAuth(request);
        if (authResult instanceof NextResponse) return authResult;
        await connectDB();
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const filter: any = { userId: authResult.userId };
        const [orders, total] = await Promise.all([
          Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name email'),
          Order.countDocuments(filter),
        ]);

        const ordersWithItems = await Promise.all(orders.map(async (order: any) => {
          const items = await OrderItem.find({ orderId: order._id });
          const orderObj = docToObjWithUser(order);
          orderObj.items = items.map(itemToObj);
          return orderObj;
        }));

        return NextResponse.json({
          success: true,
          data: { orders: ordersWithItems, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
        });
      }

      // POST /api/orders
      if (segments.length === 1 && method === 'POST') {
        const authResult = requireAuth(request);
        if (authResult instanceof NextResponse) return authResult;
        await connectDB();
        const body = await getRequestBody(request);
        const { shippingAddress, paymentMethod = 'cod', couponCode, shippingMethod = 'standard' } = body || {};

        const cartItems = await CartItem.find({ userId: authResult.userId }).populate('productId');
        if (cartItems.length === 0) {
          return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 });
        }

        let subtotal = 0;
        const orderItemsData = cartItems.map((item: any) => {
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
              return NextResponse.json({ success: false, error: 'Coupon has expired' }, { status: 400 });
            }
            if (coupon.minPurchase && subtotal < coupon.minPurchase) {
              return NextResponse.json({ success: false, error: `Minimum purchase of $${coupon.minPurchase} required` }, { status: 400 });
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

        let shippingCost: number;
        switch (shippingMethod) {
          case 'express': shippingCost = 19.99; break;
          case 'international': shippingCost = 24.99; break;
          default: shippingCost = subtotal > 100 ? 0 : 9.99; break;
        }

        const total = subtotal - discount + shippingCost;
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        const order = await Order.create({
          userId: authResult.userId, orderNumber, subtotal, shippingCost, discount, total,
          shippingAddress, shippingMethod, paymentMethod,
        });

        for (const itemData of orderItemsData) {
          await OrderItem.create({ orderId: order._id, ...itemData });
        }

        await CartItem.deleteMany({ userId: authResult.userId });
        return NextResponse.json({ success: true, data: { orderId: order._id, orderNumber } }, { status: 201 });
      }

      // Routes with :id
      if (segments.length === 2) {
        const id = segments[1];

        // GET /api/orders/:id
        if (method === 'GET') {
          const authResult = requireAuth(request);
          if (authResult instanceof NextResponse) return authResult;
          await connectDB();
          const order = await Order.findById(id).populate('userId', 'name email');
          if (!order) {
            return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
          }
          if (authResult.role !== 'admin' && (order.userId as any)?._id?.toString() !== authResult.userId) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
          }
          const items = await OrderItem.find({ orderId: order._id });
          const orderObj = docToObjWithUser(order);
          orderObj.items = items.map(itemToObj);
          return NextResponse.json({ success: true, data: orderObj });
        }

        // PUT /api/orders/:id (admin)
        if (method === 'PUT') {
          const adminResult = requireAdmin(request);
          if (adminResult instanceof NextResponse) return adminResult;
          await connectDB();
          const body = await getRequestBody(request);
          const { status } = body || {};
          const updateData: any = { status };
          if (status === 'delivered') updateData.deliveredAt = new Date();
          if (status === 'cancelled') updateData.cancelledAt = new Date();
          const order = await Order.findByIdAndUpdate(id, updateData, { new: true });
          if (!order) {
            return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
          }
          return NextResponse.json({ success: true, data: docToObjWithUser(order) });
        }

        // DELETE /api/orders/:id (admin)
        if (method === 'DELETE') {
          const adminResult = requireAdmin(request);
          if (adminResult instanceof NextResponse) return adminResult;
          await connectDB();
          const order = await Order.findByIdAndDelete(id);
          if (!order) {
            return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
          }
          await OrderItem.deleteMany({ orderId: order._id });
          return NextResponse.json({ success: true, message: 'Order deleted' });
        }
      }
    }

    // ==================== COUPON ROUTES ====================
    if (segments[0] === 'coupons') {
      // POST /api/coupons/validate
      if (segments.length === 2 && segments[1] === 'validate' && method === 'POST') {
        const authResult = requireAuth(request);
        if (authResult instanceof NextResponse) return authResult;
        await connectDB();
        const body = await getRequestBody(request);
        const { code, cartTotal } = body || {};
        if (!code) return NextResponse.json({ success: false, error: 'Coupon code is required' }, { status: 400 });
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
        if (!coupon) return NextResponse.json({ success: false, error: 'Invalid coupon code' }, { status: 404 });
        if (coupon.expiresAt && coupon.expiresAt < new Date()) return NextResponse.json({ success: false, error: 'Coupon has expired' }, { status: 400 });
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return NextResponse.json({ success: false, error: 'Coupon usage limit reached' }, { status: 400 });
        if (coupon.minPurchase && cartTotal < coupon.minPurchase) return NextResponse.json({ success: false, error: `Minimum purchase of $${coupon.minPurchase} required` }, { status: 400 });

        let discount = 0;
        if (coupon.discountType === 'percentage') {
          discount = cartTotal * (coupon.discount / 100);
          if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
        } else {
          discount = coupon.discount;
        }
        return NextResponse.json({ success: true, data: { discount, code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discount } });
      }

      // GET /api/coupons (admin)
      if (segments.length === 1 && method === 'GET') {
        const adminResult = requireAdmin(request);
        if (adminResult instanceof NextResponse) return adminResult;
        await connectDB();
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;
        const [coupons, total] = await Promise.all([
          Coupon.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
          Coupon.countDocuments(),
        ]);
        return NextResponse.json({
          success: true,
          data: { coupons: coupons.map(docToObj), pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
        });
      }

      // POST /api/coupons (admin)
      if (segments.length === 1 && method === 'POST') {
        const adminResult = requireAdmin(request);
        if (adminResult instanceof NextResponse) return adminResult;
        await connectDB();
        const body = await getRequestBody(request);
        try {
          const coupon = await Coupon.create(body);
          return NextResponse.json({ success: true, data: docToObj(coupon) }, { status: 201 });
        } catch (error: any) {
          if (error.code === 11000) {
            return NextResponse.json({ success: false, error: 'Coupon code already exists' }, { status: 400 });
          }
          throw error;
        }
      }

      // Routes with :id
      if (segments.length === 2) {
        const id = segments[1];

        // PUT /api/coupons/:id (admin)
        if (method === 'PUT') {
          const adminResult = requireAdmin(request);
          if (adminResult instanceof NextResponse) return adminResult;
          await connectDB();
          const body = await getRequestBody(request);
          const coupon = await Coupon.findByIdAndUpdate(id, body, { new: true, runValidators: true });
          if (!coupon) return NextResponse.json({ success: false, error: 'Coupon not found' }, { status: 404 });
          return NextResponse.json({ success: true, data: docToObj(coupon) });
        }

        // DELETE /api/coupons/:id (admin)
        if (method === 'DELETE') {
          const adminResult = requireAdmin(request);
          if (adminResult instanceof NextResponse) return adminResult;
          await connectDB();
          const coupon = await Coupon.findByIdAndDelete(id);
          if (!coupon) return NextResponse.json({ success: false, error: 'Coupon not found' }, { status: 404 });
          return NextResponse.json({ success: true, message: 'Coupon deleted' });
        }
      }
    }

    // ==================== DELIVERY METHOD ROUTES ====================
    if (segments[0] === 'delivery-methods') {
      // GET /api/delivery-methods/all (admin)
      if (segments.length === 2 && segments[1] === 'all' && method === 'GET') {
        const adminResult = requireAdmin(request);
        if (adminResult instanceof NextResponse) return adminResult;
        await connectDB();
        const methods = await DeliveryMethod.find().sort({ order: 1, price: 1 });
        return NextResponse.json({ success: true, data: methods.map(docToObj) });
      }

      // GET /api/delivery-methods (active only)
      if (segments.length === 1 && method === 'GET') {
        await connectDB();
        const methods = await DeliveryMethod.find({ isActive: true }).sort({ order: 1, price: 1 });
        return NextResponse.json({ success: true, data: methods.map(docToObj) });
      }

      // POST /api/delivery-methods (admin)
      if (segments.length === 1 && method === 'POST') {
        const adminResult = requireAdmin(request);
        if (adminResult instanceof NextResponse) return adminResult;
        await connectDB();
        const body = await getRequestBody(request);
        const { name, description, price, freeOverAmount, estimatedDays, isActive, order } = body || {};
        if (!name || price === undefined) {
          return NextResponse.json({ success: false, error: 'Name and price are required' }, { status: 400 });
        }
        const method = await DeliveryMethod.create({
          name, description: description || '', price: parseFloat(price),
          freeOverAmount: freeOverAmount ? parseFloat(freeOverAmount) : undefined,
          estimatedDays: estimatedDays || '', isActive: isActive !== undefined ? isActive : true, order: order || 0,
        });
        return NextResponse.json({ success: true, data: docToObj(method) }, { status: 201 });
      }

      // Routes with :id
      if (segments.length === 2 && segments[1] !== 'all') {
        const id = segments[1];

        // PUT /api/delivery-methods/:id (admin)
        if (method === 'PUT') {
          const adminResult = requireAdmin(request);
          if (adminResult instanceof NextResponse) return adminResult;
          await connectDB();
          const body = await getRequestBody(request) || {};
          const updateData: any = {};
          if (body.name !== undefined) updateData.name = body.name;
          if (body.description !== undefined) updateData.description = body.description;
          if (body.price !== undefined) updateData.price = parseFloat(body.price);
          if (body.freeOverAmount !== undefined) updateData.freeOverAmount = body.freeOverAmount ? parseFloat(body.freeOverAmount) : null;
          if (body.estimatedDays !== undefined) updateData.estimatedDays = body.estimatedDays;
          if (body.isActive !== undefined) updateData.isActive = body.isActive;
          if (body.order !== undefined) updateData.order = parseInt(body.order);
          const method = await DeliveryMethod.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
          if (!method) return NextResponse.json({ success: false, error: 'Delivery method not found' }, { status: 404 });
          return NextResponse.json({ success: true, data: docToObj(method) });
        }

        // DELETE /api/delivery-methods/:id (admin)
        if (method === 'DELETE') {
          const adminResult = requireAdmin(request);
          if (adminResult instanceof NextResponse) return adminResult;
          await connectDB();
          const method = await DeliveryMethod.findByIdAndDelete(id);
          if (!method) return NextResponse.json({ success: false, error: 'Delivery method not found' }, { status: 404 });
          return NextResponse.json({ success: true, message: 'Delivery method deleted' });
        }
      }
    }

    // ==================== GIFT CARD ROUTES ====================
    if (segments[0] === 'gift-cards') {
      // GET /api/gift-cards/all (admin)
      if (segments.length === 2 && segments[1] === 'all' && method === 'GET') {
        const adminResult = requireAdmin(request);
        if (adminResult instanceof NextResponse) return adminResult;
        await connectDB();
        const giftCards = await GiftCard.find().sort({ price: 1 });
        return NextResponse.json({ success: true, data: giftCards.map(docToObj) });
      }

      // GET /api/gift-cards (active only)
      if (segments.length === 1 && method === 'GET') {
        await connectDB();
        const giftCards = await GiftCard.find({ isActive: true }).sort({ price: 1 });
        return NextResponse.json({ success: true, data: giftCards.map(docToObj) });
      }

      // POST /api/gift-cards (admin)
      if (segments.length === 1 && method === 'POST') {
        const adminResult = requireAdmin(request);
        if (adminResult instanceof NextResponse) return adminResult;
        await connectDB();
        const body = await getRequestBody(request);
        const { name, description, price, salePrice, image, isActive } = body || {};
        if (!name || !price) {
          return NextResponse.json({ success: false, error: 'Name and price are required' }, { status: 400 });
        }
        const giftCard = await GiftCard.create({
          name, description: description || '', price: parseFloat(price),
          salePrice: salePrice ? parseFloat(salePrice) : undefined,
          image: image || '', isActive: isActive !== undefined ? isActive : true,
        });
        return NextResponse.json({ success: true, data: docToObj(giftCard) }, { status: 201 });
      }

      // Routes with :id
      if (segments.length === 2 && segments[1] !== 'all') {
        const id = segments[1];

        // PUT /api/gift-cards/:id (admin)
        if (method === 'PUT') {
          const adminResult = requireAdmin(request);
          if (adminResult instanceof NextResponse) return adminResult;
          await connectDB();
          const body = await getRequestBody(request) || {};
          const updateData: any = {};
          if (body.name !== undefined) updateData.name = body.name;
          if (body.description !== undefined) updateData.description = body.description;
          if (body.price !== undefined) updateData.price = parseFloat(body.price);
          if (body.salePrice !== undefined) updateData.salePrice = body.salePrice ? parseFloat(body.salePrice) : null;
          if (body.image !== undefined) updateData.image = body.image;
          if (body.isActive !== undefined) updateData.isActive = body.isActive;
          const giftCard = await GiftCard.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
          if (!giftCard) return NextResponse.json({ success: false, error: 'Gift card not found' }, { status: 404 });
          return NextResponse.json({ success: true, data: docToObj(giftCard) });
        }

        // DELETE /api/gift-cards/:id (admin)
        if (method === 'DELETE') {
          const adminResult = requireAdmin(request);
          if (adminResult instanceof NextResponse) return adminResult;
          await connectDB();
          const giftCard = await GiftCard.findByIdAndDelete(id);
          if (!giftCard) return NextResponse.json({ success: false, error: 'Gift card not found' }, { status: 404 });
          return NextResponse.json({ success: true, message: 'Gift card deleted' });
        }
      }
    }

    // ==================== RECENTLY VIEWED ROUTES ====================
    if (segments[0] === 'recently-viewed') {
      // GET /api/recently-viewed
      if (segments.length === 1 && method === 'GET') {
        const authResult = requireAuth(request);
        if (authResult instanceof NextResponse) return authResult;
        await connectDB();
        const recentlyViewed = await RecentlyViewed.find({ userId: authResult.userId })
          .populate({ path: 'productId', select: 'name slug price salePrice images brand averageRating totalReviews' })
          .sort({ createdAt: -1 })
          .limit(10);

        const parsedItems = recentlyViewed.map((item: any) => {
          const obj = docToObj(item);
          if (obj.productId && typeof obj.productId === 'object') {
            obj.product = docToObj(obj.productId);
            delete obj.productId;
          }
          return obj;
        });
        return NextResponse.json({ success: true, data: parsedItems });
      }

      // POST /api/recently-viewed
      if (segments.length === 1 && method === 'POST') {
        const authResult = requireAuth(request);
        if (authResult instanceof NextResponse) return authResult;
        await connectDB();
        const body = await getRequestBody(request);
        const { productId } = body || {};
        if (!productId) return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
        const product = await Product.findById(productId);
        if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });

        const existing = await RecentlyViewed.findOne({ userId: authResult.userId, productId });
        if (existing) {
          await RecentlyViewed.findByIdAndUpdate(existing._id, { createdAt: new Date() });
        } else {
          await RecentlyViewed.create({ userId: authResult.userId, productId });
        }
        return NextResponse.json({ success: true, message: 'Product added to recently viewed' });
      }

      // DELETE /api/recently-viewed/:id
      if (segments.length === 2 && method === 'DELETE') {
        const authResult = requireAuth(request);
        if (authResult instanceof NextResponse) return authResult;
        await connectDB();
        const item = await RecentlyViewed.findOneAndDelete({ _id: segments[1], userId: authResult.userId });
        if (!item) return NextResponse.json({ success: false, error: 'Recently viewed item not found' }, { status: 404 });
        return NextResponse.json({ success: true, message: 'Item removed from recently viewed' });
      }
    }

    // ==================== NEWSLETTER ROUTE ====================
    if (segments[0] === 'newsletter') {
      // POST /api/newsletter
      if (segments.length === 1 && method === 'POST') {
        await connectDB();
        const body = await getRequestBody(request);
        const { email } = body || {};
        if (!email) return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
        const existing = await Newsletter.findOne({ email: email.toLowerCase() });
        if (existing) return NextResponse.json({ success: true, message: 'Already subscribed' });
        await Newsletter.create({ email: email.toLowerCase() });
        return NextResponse.json({ success: true, message: 'Subscribed successfully' });
      }
    }

    // ==================== ADMIN ROUTES ====================
    if (segments[0] === 'admin') {
      // GET /api/admin/stats
      if (segments[1] === 'stats' && method === 'GET') {
        const adminResult = requireAdmin(request);
        if (adminResult instanceof NextResponse) return adminResult;
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
        const statusMap: any = {};
        ordersByStatus.forEach((item: any) => { statusMap[item._id] = item.count; });

        const monthlySales = await Order.aggregate([
          { $match: { status: { $ne: 'cancelled' } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, sales: { $sum: '$total' }, orders: { $sum: 1 } } },
          { $sort: { _id: 1 } }, { $limit: 12 },
        ]);

        const topProducts = await OrderItem.aggregate([
          { $group: { _id: '$productId', totalSold: { $sum: '$quantity' } } },
          { $sort: { totalSold: -1 } }, { $limit: 5 },
        ]);
        const topProductsWithData = await Promise.all(topProducts.map(async (item: any) => {
          const product = await Product.findById(item._id).select('name price images');
          return product ? { ...docToObj(product), totalSold: item.totalSold } : null;
        }));

        return NextResponse.json({
          success: true,
          data: {
            totalUsers, totalProducts, totalOrders,
            totalRevenue: totalRevenue[0]?.total || 0,
            ordersByStatus: statusMap,
            monthlySales: monthlySales.map((m: any) => ({ month: m._id, sales: m.sales, orders: m.orders })),
            topProducts: topProductsWithData.filter(Boolean),
          },
        });
      }

      // GET /api/admin/users
      if (segments[1] === 'users' && method === 'GET') {
        const adminResult = requireAdmin(request);
        if (adminResult instanceof NextResponse) return adminResult;
        await connectDB();
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search');
        const skip = (page - 1) * limit;

        const filter: any = {};
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
        return NextResponse.json({
          success: true,
          data: { users: users.map(docToObjUser), pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
        });
      }

      // PUT /api/admin/users/:id (toggle block)
      if (segments[1] === 'users' && segments.length === 3 && method === 'PUT') {
        const adminResult = requireAdmin(request);
        if (adminResult instanceof NextResponse) return adminResult;
        await connectDB();
        const dbUser = await User.findById(segments[2]);
        if (!dbUser) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        dbUser.isBlocked = !dbUser.isBlocked;
        await dbUser.save();
        return NextResponse.json({ success: true, data: docToObjUser(dbUser) });
      }

      // DELETE /api/admin/users/:id (with cascade)
      if (segments[1] === 'users' && segments.length === 3 && method === 'DELETE') {
        const adminResult = requireAdmin(request);
        if (adminResult instanceof NextResponse) return adminResult;
        await connectDB();
        if (adminResult.userId === segments[2]) {
          return NextResponse.json({ success: false, error: 'Cannot delete your own account' }, { status: 400 });
        }
        const dbUser = await User.findByIdAndDelete(segments[2]);
        if (!dbUser) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

        const userReviews = await Review.find({ userId: segments[2] }).select('productId');
        const affectedProductIds = [...new Set(userReviews.map((r: any) => r.productId.toString()))];

        const [reviewsResult, cartResult, wishlistResult, recentlyResult, ordersResult] = await Promise.all([
          Review.deleteMany({ userId: segments[2] }),
          CartItem.deleteMany({ userId: segments[2] }),
          WishlistItem.deleteMany({ userId: segments[2] }),
          RecentlyViewed.deleteMany({ userId: segments[2] }),
          Order.updateMany({ userId: segments[2] }, { $set: { userId: null } }),
        ]);

        await Promise.all(affectedProductIds.map((pid: string) => recalculateProductRating(pid)));

        return NextResponse.json({
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
      }

      // GET /api/admin/orders
      if (segments[1] === 'orders' && segments.length === 2 && method === 'GET') {
        const adminResult = requireAdmin(request);
        if (adminResult instanceof NextResponse) return adminResult;
        await connectDB();
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const status = searchParams.get('status');
        const skip = (page - 1) * limit;

        const filter: any = {};
        if (status) filter.status = status;

        const [orders, total] = await Promise.all([
          Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name email'),
          Order.countDocuments(filter),
        ]);

        const ordersData = orders.map((o: any) => {
          const obj = o.toObject ? o.toObject() : o;
          const { _id, __v, ...rest } = obj;
          const result: any = { id: _id.toString(), ...rest };
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

        return NextResponse.json({
          success: true,
          data: { orders: ordersData, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
        });
      }

      // GET /api/admin/products
      if (segments[1] === 'products' && segments.length === 2 && method === 'GET') {
        const adminResult = requireAdmin(request);
        if (adminResult instanceof NextResponse) return adminResult;
        await connectDB();
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search');
        const skip = (page - 1) * limit;

        const filter: any = {};
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
        return NextResponse.json({
          success: true,
          data: { products: products.map(docToObjWithCategory), pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
        });
      }

      // GET /api/admin/reviews
      if (segments[1] === 'reviews' && segments.length === 2 && method === 'GET') {
        const adminResult = requireAdmin(request);
        if (adminResult instanceof NextResponse) return adminResult;
        await connectDB();
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const [reviews, total] = await Promise.all([
          Review.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name email avatar').populate('productId', 'name'),
          Review.countDocuments(),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            reviews: reviews.map((r: any) => {
              const obj = r.toObject();
              const { _id, __v, ...rest } = obj;
              const result: any = { id: _id.toString(), ...rest };
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
      }

      // DELETE /api/admin/reviews/:id
      if (segments[1] === 'reviews' && segments.length === 3 && method === 'DELETE') {
        const adminResult = requireAdmin(request);
        if (adminResult instanceof NextResponse) return adminResult;
        await connectDB();
        const review = await Review.findByIdAndDelete(segments[2]);
        if (!review) return NextResponse.json({ success: false, error: 'Review not found' }, { status: 404 });
        await recalculateProductRating(review.productId.toString());
        return NextResponse.json({ success: true, message: 'Review deleted', data: { productId: review.productId.toString() } });
      }
    }

    // ==================== SEED ROUTE ====================
    if (segments[0] === 'seed' && method === 'POST') {
      await connectDB();

      await Promise.all([
        OrderItem.deleteMany({}), Order.deleteMany({}), CartItem.deleteMany({}),
        WishlistItem.deleteMany({}), RecentlyViewed.deleteMany({}), Review.deleteMany({}),
        Product.deleteMany({}), Category.deleteMany({}), Newsletter.deleteMany({}),
        Coupon.deleteMany({}), User.deleteMany({}),
        GiftCard.deleteMany({}), DeliveryMethod.deleteMany({}),
      ]);

      // Delivery Methods — complete data
      await DeliveryMethod.create([
        { name: 'Standard Shipping', description: 'Reliable ground shipping to your doorstep', price: 9.99, freeOverAmount: 100, estimatedDays: '3-5 business days', isActive: true, order: 0 },
        { name: 'Express Shipping', description: 'Fast delivery for urgent orders', price: 19.99, freeOverAmount: 200, estimatedDays: '1-2 business days', isActive: true, order: 1 },
        { name: 'International Shipping', description: 'Worldwide delivery. Rates vary by destination.', price: 24.99, estimatedDays: '7-14 business days', isActive: true, order: 2 },
      ]);

      // Gift Cards — complete data with images
      await GiftCard.create([
        { name: '$25 Gift Card', description: 'Perfect for a small treat — give the gift of choice with our $25 e-gift card', price: 25, image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80', isActive: true },
        { name: '$50 Gift Card', description: 'A thoughtful gift for any occasion — our $50 e-gift card covers a stylish accessory or basic', price: 50, salePrice: 45, image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80', isActive: true },
        { name: '$100 Gift Card', description: 'Give the gift of choice — our $100 e-gift card is ideal for a full outfit or premium piece', price: 100, salePrice: 90, image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80', isActive: true },
        { name: '$200 Gift Card', description: 'The ultimate gift for fashion lovers — our $200 e-gift card unlocks the entire collection', price: 200, salePrice: 175, image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80', isActive: true },
      ]);

      // Categories — complete data with images and descriptions
      const menCategory = await Category.create({ name: 'Men', slug: 'men', description: "Discover premium men's clothing — from tailored suits to casual essentials, elevate every moment with timeless style.", image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&q=80' });
      const womenCategory = await Category.create({ name: 'Women', slug: 'women', description: "Explore our curated women's collection — elegant dresses, chic separates, and wardrobe staples crafted for the modern woman.", image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&q=80' });
      const kidsCategory = await Category.create({ name: 'Kids', slug: 'kids', description: "Fun, comfortable, and durable clothing for kids — playful prints and quality fabrics that keep up with their adventures.", image: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=600&q=80' });
      const shoesCategory = await Category.create({ name: 'Shoes', slug: 'shoes', description: 'Step out in style — from everyday sneakers to elegant boots, find the perfect pair for every occasion.', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80' });
      const accessoriesCategory = await Category.create({ name: 'Accessories', slug: 'accessories', description: 'Complete your look with our accessories collection — bags, watches, sunglasses, and more to refine your personal style.', image: 'https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=600&q=80' });

      // Admin user — complete
      const adminPassword = await bcrypt.hash('admin123', 12);
      await User.create({
        email: 'admin@example.com', name: 'Admin User', password: adminPassword, role: 'admin',
        avatar: 'https://i.pravatar.cc/150?u=admin',
        phone: '+1-555-0100',
      });

      // Regular users — complete with avatars
      const userNames = ['John Smith', 'Emma Wilson', 'Michael Brown', 'Sarah Davis', 'James Johnson', 'Olivia Martinez', 'William Anderson', 'Sophia Taylor', 'Benjamin Thomas', 'Isabella Garcia'];
      for (let i = 0; i < userNames.length; i++) {
        const password = await bcrypt.hash('password123', 12);
        await User.create({ email: `user${i + 1}@example.com`, name: userNames[i], password, avatar: `https://i.pravatar.cc/150?u=${i + 1}` });
      }

      // Men's Products — every product has unique description, relevant images, all fields
      const menProducts = [
        { name: 'Classic Oxford Shirt', brand: 'Heritage', price: 89.99, salePrice: 69.99, sizes: ['S', 'M', 'L', 'XL'], colors: ['White', 'Blue', 'Pink'], images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80'], stock: 150, isFeatured: true, isBestSeller: true, description: 'Timeless Oxford shirt in premium cotton. Features a button-down collar, barrel cuffs, and a relaxed fit that works from office to weekend. The breathable fabric keeps you comfortable all day.' },
        { name: 'Slim Fit Blazer', brand: 'Modern Tailor', price: 199.99, salePrice: null, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['Navy', 'Charcoal', 'Black'], images: ['https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80'], stock: 80, isFeatured: true, isNewArrival: true, description: 'Sharp slim-fit blazer with a contemporary silhouette. Notch lapels, two-button closure, and interior pockets. Crafted from a stretch wool blend for comfort and movement.' },
        { name: 'Casual Polo T-Shirt', brand: 'Urban Style', price: 45.00, salePrice: 35.00, sizes: ['S', 'M', 'L', 'XL'], colors: ['White', 'Black', 'Red'], images: ['https://images.unsplash.com/photo-1625910513413-5fc3e4fd1aa2?w=800&q=80', 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=800&q=80'], stock: 200, isBestSeller: true, isTrending: true, description: 'Classic polo in soft piqué cotton. Ribbed collar, two-button placket, and a comfortable regular fit. Perfect for smart-casual occasions or a relaxed weekend look.' },
        { name: 'Denim Jacket', brand: 'Rugged Wear', price: 129.99, salePrice: 99.99, sizes: ['S', 'M', 'L', 'XL'], colors: ['Blue', 'Black', 'Light Wash'], images: ['https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80', 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&q=80'], stock: 60, isTrending: true, description: 'Iconic denim jacket in washed indigo cotton. Button-front closure, chest flap pockets, and adjustable side tabs. A wardrobe essential that layers over everything.' },
        { name: 'Formal Dress Pants', brand: 'Executive', price: 79.99, salePrice: null, sizes: ['28', '30', '32', '34', '36'], colors: ['Black', 'Navy', 'Gray'], images: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80', 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80'], stock: 120, isFeatured: true, description: 'Tailored dress pants with a flat front and permanent crease. Wrinkle-resistant fabric with a hint of stretch for all-day comfort. Pair with our Oxford shirt for a polished look.' },
        { name: 'Graphic Print Hoodie', brand: 'Street King', price: 69.99, salePrice: 54.99, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['Black', 'Gray', 'Navy'], images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80', 'https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?w=800&q=80'], stock: 180, isFlashSale: true, flashSaleEnds: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), description: 'Eye-catching hoodie with original graphic print. Soft fleece interior, kangaroo pocket, and ribbed cuffs. A streetwear standout that keeps you warm and stylish.' },
        { name: 'Linen Summer Shirt', brand: 'Coastal Breeze', price: 59.99, salePrice: 44.99, sizes: ['S', 'M', 'L', 'XL'], colors: ['White', 'Sky Blue', 'Beige'], images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80'], stock: 90, isNewArrival: true, description: 'Lightweight linen shirt built for warm weather. Camp collar, relaxed fit, and a naturally breathable texture. Ideal for beach days, barbecues, and vacation style.' },
        { name: 'Cashmere Sweater', brand: 'Luxe Knit', price: 159.99, salePrice: null, sizes: ['S', 'M', 'L', 'XL'], colors: ['Camel', 'Black', 'Burgundy'], images: ['https://images.unsplash.com/photo-1614975059251-992f11792571?w=800&q=80', 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=800&q=80'], stock: 45, isFeatured: true, isNewArrival: true, description: 'Luxurious 100% cashmere sweater with a clean crew neck. Incredibly soft hand-feel, lightweight warmth, and a refined silhouette. An investment piece for any gentleman\'s wardrobe.' },
        { name: 'Chino Shorts', brand: 'Weekend Warrior', price: 49.99, salePrice: 39.99, sizes: ['28', '30', '32', '34', '36'], colors: ['Khaki', 'Navy', 'Olive'], images: ['https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&q=80', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80'], stock: 160, isBestSeller: true, description: 'Versatile chino shorts in soft brushed cotton. 7-inch inseam, slash pockets, and a slim-straight cut. Dress them up or down — a summer staple you\'ll reach for daily.' },
        { name: 'Wool Overcoat', brand: 'Heritage', price: 299.99, salePrice: 249.99, sizes: ['S', 'M', 'L', 'XL'], colors: ['Camel', 'Black', 'Gray'], images: ['https://images.unsplash.com/photo-1544923246-77307dd270b1?w=800&q=80', 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80'], stock: 35, isTrending: true, isFeatured: true, description: 'Structured wool-blend overcoat with peak lapels and a double-breasted front. Fully lined with interior pockets. A commanding piece that elevates any cold-weather outfit.' },
        { name: 'V-Neck T-Shirt Pack', brand: 'Essential', price: 35.00, salePrice: 28.00, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['White', 'Black', 'Gray'], images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80', 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=800&q=80'], stock: 300, isBestSeller: true, description: 'Essential V-neck tees in premium combed cotton. Slim fit with reinforced seams. These versatile basics form the foundation of any well-dressed man\'s wardrobe.' },
      ];

      // Women's Products — every product has unique description, relevant images, all fields
      const womenProducts = [
        { name: 'Silk Wrap Dress', brand: 'Elegance', price: 159.99, salePrice: 119.99, sizes: ['XS', 'S', 'M', 'L'], colors: ['Floral', 'Black', 'Burgundy'], images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80'], stock: 70, isFeatured: true, isBestSeller: true, description: 'Flowing silk wrap dress with a flattering crossover neckline and adjustable tie waist. The drape and sheen of pure silk make this a showstopper for dinner dates and special events.' },
        { name: 'High-Waist Skinny Jeans', brand: 'Curve', price: 79.99, salePrice: null, sizes: ['24', '26', '28', '30', '32'], colors: ['Dark Blue', 'Black', 'Light Wash'], images: ['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80', 'https://images.unsplash.com/photo-1541123603104-512919d6a96c?w=800&q=80'], stock: 150, isTrending: true, description: 'Figure-flattering high-rise skinny jeans in stretch denim. Classic five-pocket design, zip fly, and ankle-length cut. Sculpting and comfortable from morning to night.' },
        { name: 'Blouse with Ruffle Details', brand: 'Feminine Touch', price: 69.99, salePrice: 54.99, sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['White', 'Pink', 'Navy'], images: ['https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&q=80', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80'], stock: 110, isNewArrival: true, description: 'Romantic blouse with cascading ruffle details and a relaxed fit. Lightweight chiffon fabric with covered buttons. A feminine statement piece for work or weekend.' },
        { name: 'Cashmere Cardigan', brand: 'Luxe Knit', price: 189.99, salePrice: 149.99, sizes: ['S', 'M', 'L'], colors: ['Cream', 'Blush', 'Gray'], images: ['https://images.unsplash.com/photo-1434389677669-e08b4cda3a5a?w=800&q=80', 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=800&q=80'], stock: 55, isFeatured: true, description: 'Sumptuously soft cashmere cardigan with a relaxed open-front design. Ribbed cuffs and hem, dropped shoulders, and a slightly oversized silhouette. Layering luxury at its finest.' },
        { name: 'A-Line Midi Skirt', brand: 'Vintage Rose', price: 69.99, salePrice: null, sizes: ['XS', 'S', 'M', 'L'], colors: ['Black', 'Navy', 'Forest Green'], images: ['https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&q=80', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80'], stock: 85, isBestSeller: true, description: 'Elegant A-line midi skirt with a smooth waistband and invisible back zip. The structured fabric holds its shape beautifully. Pair with a tucked blouse for effortless sophistication.' },
        { name: 'Tailored Blazer', brand: 'Power Suite', price: 179.99, salePrice: 139.99, sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['Black', 'Navy', 'Camel'], images: ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80', 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&q=80'], stock: 65, isNewArrival: true, isTrending: true, description: 'Impeccably tailored blazer with padded shoulders and a nipped waist. Single-button closure, flap pockets, and a fully lined interior. Power dressing, redefined for the modern woman.' },
        { name: 'Floral Maxi Dress', brand: 'Garden Party', price: 129.99, salePrice: 99.99, sizes: ['XS', 'S', 'M', 'L'], colors: ['Floral Print', 'Blue Floral', 'Pink Floral'], images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80'], stock: 75, isFlashSale: true, flashSaleEnds: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), description: 'Breezy floral maxi dress with a smocked bodice and tiered skirt. Adjustable spaghetti straps and a vibrant print make this a summer essential for garden parties and beach strolls.' },
        { name: 'Cropped Denim Jacket', brand: 'Urban Chic', price: 99.99, salePrice: null, sizes: ['XS', 'S', 'M', 'L'], colors: ['Blue', 'White', 'Black'], images: ['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&q=80', 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80'], stock: 95, isBestSeller: true, description: 'Trendy cropped denim jacket with raw-cut hems and oversized buttons. Boxy silhouette hits at the natural waist — perfect over dresses and high-rise bottoms. A layering hero.' },
        { name: 'Satin Camisole Top', brand: 'Night & Day', price: 45.00, salePrice: 35.00, sizes: ['XS', 'S', 'M', 'L'], colors: ['Champagne', 'Black', 'Ivory'], images: ['https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&q=80', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80'], stock: 130, isTrending: true, description: 'Delicate satin camisole with adjustable straps and a V-neckline. The lustrous fabric drapes beautifully and works under blazers or on its own for effortless evening style.' },
        { name: 'Wide-Leg Palazzo Pants', brand: 'Seventies Revival', price: 89.99, salePrice: 69.99, sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['Black', 'White', 'Tan'], images: ['https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&q=80', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80'], stock: 80, isFeatured: true, isNewArrival: true, description: 'Flowing wide-leg palazzo pants in a crepe-like fabric. High-waisted with a flat front and concealed zip. Dramatic and comfortable — channel vintage glamour with ease.' },
        { name: 'Turtleneck Sweater', brand: 'Cozy Knits', price: 75.00, salePrice: 59.00, sizes: ['S', 'M', 'L', 'XL'], colors: ['Cream', 'Olive', 'Wine'], images: ['https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=800&q=80', 'https://images.unsplash.com/photo-1434389677669-e08b4cda3a5a?w=800&q=80'], stock: 100, isBestSeller: true, description: 'Chunky knit turtleneck in a soft merino-wool blend. Ribbed cuffs, relaxed body, and a cozy rolled neck. Your go-to for crisp days — pair with jeans or tailoring.' },
      ];

      // Kids' Products — every product has unique description, relevant images, all fields
      const kidsProducts = [
        { name: 'Fun Print T-Shirt', brand: 'Little Stars', price: 24.99, salePrice: 19.99, sizes: ['2T', '3T', '4T', '5T'], colors: ['Red', 'Blue', 'Yellow'], images: ['https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80', 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80'], stock: 200, isFeatured: true, description: 'Playful graphic tee in soft organic cotton. Colorful print that stays vibrant wash after wash. Tag-free neck label for itch-free comfort that kids love.' },
        { name: 'Denim Overalls', brand: 'Playtime', price: 39.99, salePrice: null, sizes: ['2T', '3T', '4T', '5T', '6'], colors: ['Blue', 'Light Wash'], images: ['https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80', 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80'], stock: 120, isBestSeller: true, description: 'Classic denim overalls with adjustable straps and snap-button sides. Reinforced knees for active play and a chest pocket for treasures. Durable enough for everyday adventures.' },
        { name: 'Rainbow Hoodie', brand: 'Happy Kids', price: 34.99, salePrice: 27.99, sizes: ['4', '5', '6', '7', '8'], colors: ['Rainbow', 'Pink', 'Blue'], images: ['https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80', 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80'], stock: 150, isNewArrival: true, isTrending: true, description: 'Cheerful rainbow-striped hoodie in brushed fleece. Cozy kangaroo pocket, ribbed hem, and a relaxed fit. Makes getting dressed fun on chilly mornings.' },
        { name: 'Summer Shorts Set', brand: 'Sunny Days', price: 29.99, salePrice: 22.99, sizes: ['2T', '3T', '4T', '5T'], colors: ['Green', 'Orange', 'Blue'], images: ['https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80', 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80'], stock: 180, isFlashSale: true, flashSaleEnds: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), description: 'Coordinating tee and shorts set in breathable cotton jersey. Elastic waistband for easy dressing and vibrant prints that kids adore. A ready-made outfit for sunny days.' },
        { name: 'Cozy Pajama Set', brand: 'Dreamland', price: 32.99, salePrice: null, sizes: ['2T', '3T', '4T', '5T', '6'], colors: ['Stars', 'Dinosaurs', 'Unicorns'], images: ['https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80', 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80'], stock: 100, isFeatured: true, description: 'Snuggly pajama set in flame-resistant microfleece. Fun all-over print, ribbed cuffs, and a soft elastic waist. Bedtime has never been so inviting.' },
        { name: 'Athletic Joggers', brand: 'Active Kids', price: 27.99, salePrice: 21.99, sizes: ['4', '5', '6', '7', '8'], colors: ['Black', 'Navy', 'Gray'], images: ['https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80', 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80'], stock: 140, isBestSeller: true, description: 'Sporty jogger pants in moisture-wicking stretch fabric. Zippered pockets, drawstring waist, and tapered leg. Perfect for PE class, soccer practice, or weekend fun.' },
      ];

      // Shoes Products — every product has unique description, relevant images, all fields
      const shoesProducts = [
        { name: 'Classic Running Shoes', brand: 'SprintPro', price: 119.99, salePrice: 89.99, sizes: ['7', '8', '9', '10', '11', '12'], colors: ['Black/White', 'Navy/Red', 'Gray/Green'], images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80'], stock: 200, isFeatured: true, isBestSeller: true, isTrending: true, description: 'Lightweight running shoe with responsive cushioning and a breathable mesh upper. Engineered outsole for multi-surface grip. From daily training to race day.' },
        { name: 'Leather Chelsea Boots', brand: 'Heritage', price: 179.99, salePrice: null, sizes: ['7', '8', '9', '10', '11', '12'], colors: ['Brown', 'Black', 'Tan'], images: ['https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=800&q=80', 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&q=80'], stock: 80, isFeatured: true, description: 'Handcrafted Chelsea boots in full-grain leather. Elastic side panels, pull tab, and a stacked heel. Sleek enough for the office, rugged enough for the weekend.' },
        { name: 'White Sneakers', brand: 'Clean Kicks', price: 89.99, salePrice: 69.99, sizes: ['6', '7', '8', '9', '10', '11'], colors: ['White', 'Off-White', 'White/Gum'], images: ['https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'], stock: 250, isBestSeller: true, description: 'Minimalist white sneakers in premium leather. Low-profile silhouette, cushioned insole, and a clean rubber cupsole. The ultimate everyday shoe that goes with everything.' },
        { name: 'Hiking Trail Boots', brand: 'Mountain Peak', price: 149.99, salePrice: 119.99, sizes: ['7', '8', '9', '10', '11', '12'], colors: ['Olive/Tan', 'Black/Gray', 'Brown'], images: ['https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&q=80', 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=800&q=80'], stock: 60, isNewArrival: true, description: 'Rugged hiking boots with waterproof membrane and Vibram outsole. Padded ankle collar, protective toe cap, and moisture-wicking lining. Built for the trail, styled for the town.' },
        { name: 'Slip-On Loafers', brand: 'Comfort Plus', price: 79.99, salePrice: null, sizes: ['7', '8', '9', '10', '11'], colors: ['Navy', 'Brown', 'Black'], images: ['https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=800&q=80', 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80'], stock: 130, isTrending: true, description: 'Effortless slip-on loafers in supple suede. Cushioned footbed, flexible sole, and a classic moc-toe stitch. The perfect blend of comfort and sophistication.' },
        { name: 'Basketball High-Tops', brand: 'Court King', price: 139.99, salePrice: 109.99, sizes: ['8', '9', '10', '11', '12', '13'], colors: ['Red/Black', 'Blue/White', 'Black/Gold'], images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&q=80'], stock: 90, isFlashSale: true, flashSaleEnds: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), description: 'High-top basketball shoe with ankle support and reactive cushioning. Herringbone traction pattern, padded collar, and bold color-blocking. Dominate the court in style.' },
        { name: 'Canvas Slip-Ons', brand: 'Beach Life', price: 49.99, salePrice: 39.99, sizes: ['6', '7', '8', '9', '10', '11'], colors: ['Navy', 'Red', 'Black', 'White'], images: ['https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80', 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=800&q=80'], stock: 180, isBestSeller: true, description: 'Casual canvas slip-ons with elastic side gores and a vulcanized rubber sole. Lightweight, breathable, and ready for boardwalk strolls or coffee runs.' },
        { name: 'Formal Oxford Shoes', brand: 'Gentleman', price: 199.99, salePrice: null, sizes: ['7', '8', '9', '10', '11', '12'], colors: ['Black', 'Brown', 'Oxblood'], images: ['https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&q=80', 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=800&q=80'], stock: 50, isFeatured: true, isNewArrival: true, description: 'Traditional cap-toe Oxfords in polished calfskin. Goodyear welt construction, leather lining, and a stacked leather heel. The gold standard of formal footwear.' },
      ];

      // Accessories Products — every product has unique description, relevant images, all fields
      const accessoriesProducts = [
        { name: 'Leather Crossbody Bag', brand: 'Artisan', price: 89.99, salePrice: 69.99, sizes: ['One Size'], colors: ['Brown', 'Black', 'Tan'], images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80'], stock: 100, isFeatured: true, isBestSeller: true, description: 'Handmade crossbody bag in vegetable-tanned leather. Adjustable strap, zip-top closure, and interior card slots. Compact yet spacious enough for daily essentials.' },
        { name: 'Aviator Sunglasses', brand: 'Shade Master', price: 149.99, salePrice: null, sizes: ['One Size'], colors: ['Gold/Green', 'Silver/Blue', 'Black/Gray'], images: ['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80'], stock: 120, isTrending: true, description: 'Iconic aviator sunglasses with polarized lenses and a lightweight metal frame. Double bridge, adjustable nose pads, and 100% UV protection. Timeless cool for any face shape.' },
        { name: 'Minimalist Watch', brand: 'Timeless', price: 199.99, salePrice: 159.99, sizes: ['One Size'], colors: ['Silver/White', 'Gold/Black', 'Rose Gold/Pink'], images: ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80', 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800&q=80'], stock: 70, isFeatured: true, isNewArrival: true, description: 'Swiss-movement minimalist watch with a sapphire crystal face and Italian leather strap. 40mm case, date window, and water resistance to 50m. Understated luxury for every day.' },
        { name: 'Wool Scarf', brand: 'Winter Luxe', price: 49.99, salePrice: 39.99, sizes: ['One Size'], colors: ['Camel', 'Charcoal', 'Burgundy', 'Forest Green'], images: ['https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&q=80', 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80'], stock: 150, isBestSeller: true, description: 'Generously sized wool scarf in a soft merino blend. Finished edges with a subtle herringbone weave. Adds warmth and sophistication to any cold-weather outfit.' },
        { name: 'Leather Belt', brand: 'Heritage', price: 59.99, salePrice: 44.99, sizes: ['S', 'M', 'L', 'XL'], colors: ['Brown', 'Black', 'Tan'], images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80'], stock: 200, isFlashSale: true, flashSaleEnds: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), description: 'Full-grain leather belt with a brushed metal buckle. 35mm width suits both casual and dress attire. Ages beautifully — the more you wear it, the better it looks.' },
        { name: 'Silk Tie Set', brand: 'Gentleman', price: 45.00, salePrice: 35.00, sizes: ['One Size'], colors: ['Navy', 'Burgundy', 'Gray', 'Striped'], images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80'], stock: 90, isNewArrival: true, description: 'Set of three silk ties with matching pocket square. Classic patterns in rich colors with a luxurious hand-feel. Arrives in a gift box — ready to impress.' },
        { name: 'Canvas Tote Bag', brand: 'Eco Chic', price: 34.99, salePrice: 27.99, sizes: ['One Size'], colors: ['Natural', 'Black', 'Olive'], images: ['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80'], stock: 180, isBestSeller: true, isTrending: true, description: 'Heavy-duty organic cotton tote with reinforced handles and an interior zip pocket. Spacious enough for a laptop, eco-friendly, and effortlessly stylish for errands or the office.' },
        { name: 'Diamond Stud Earrings', brand: 'Sparkle', price: 299.99, salePrice: 249.99, sizes: ['One Size'], colors: ['Silver', 'Gold', 'Rose Gold'], images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80', 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80'], stock: 40, isFeatured: true, description: 'Brilliant-cut diamond studs in a four-prong setting. 0.5 carat total weight, ethically sourced stones, and your choice of precious metal. Everyday elegance that sparkles.' },
      ];

      const allProductData = [
        ...menProducts.map(p => ({ ...p, categoryId: menCategory._id, category: 'Men' })),
        ...womenProducts.map(p => ({ ...p, categoryId: womenCategory._id, category: 'Women' })),
        ...kidsProducts.map(p => ({ ...p, categoryId: kidsCategory._id, category: 'Kids' })),
        ...shoesProducts.map(p => ({ ...p, categoryId: shoesCategory._id, category: 'Shoes' })),
        ...accessoriesProducts.map(p => ({ ...p, categoryId: accessoriesCategory._id, category: 'Accessories' })),
      ];

      for (const pData of allProductData) {
        const slug = pData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const sku = `${pData.brand.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        await Product.create({
          name: pData.name, slug, description: pData.description,
          brand: pData.brand, price: pData.price, salePrice: pData.salePrice || undefined, sku,
          stock: pData.stock, sizes: pData.sizes, colors: pData.colors, images: pData.images,
          categoryId: pData.categoryId, category: pData.category,
          isFeatured: pData.isFeatured || false, isNewArrival: pData.isNewArrival || false,
          isBestSeller: pData.isBestSeller || false, isTrending: pData.isTrending || false,
          isFlashSale: pData.isFlashSale || false, flashSaleEnds: pData.flashSaleEnds || undefined,
        });
      }

      // Create Reviews — meaningful reviews for each product
      const allProducts = await Product.find();
      const allUsers = await User.find({ role: 'user' });
      const reviewTemplates: Record<string, { title: string; comment: string }[]> = {
        'default': [
          { title: 'Great quality!', comment: 'The quality is outstanding, exactly what I was looking for.' },
          { title: 'Love it', comment: 'Really impressed with this purchase. Would buy again!' },
          { title: 'Good value', comment: 'Good value for the price. Would definitely recommend.' },
          { title: 'Impressive', comment: 'This exceeded my expectations in every way.' },
          { title: 'Perfect fit', comment: 'True to size and very comfortable. Perfect for everyday wear.' },
          { title: 'Beautiful design', comment: 'Got so many compliments. The craftsmanship is impeccable.' },
          { title: 'Comfortable', comment: 'The fabric is soft and breathable. Super comfortable all day.' },
          { title: 'Exactly as described', comment: 'Arrived quickly and looks exactly like the photos. Very happy!' },
          { title: 'Amazing quality', comment: 'A must-have for any wardrobe. Worth every penny.' },
          { title: 'Worth every penny', comment: "I've been wearing this for a month now and it still looks brand new." },
        ],
      };

      for (let i = 0; i < 80; i++) {
        const product = allProducts[Math.floor(Math.random() * allProducts.length)];
        const user = allUsers[Math.floor(Math.random() * allUsers.length)];
        const review = reviewTemplates.default[Math.floor(Math.random() * reviewTemplates.default.length)];
        try {
          await Review.create({
            userId: user._id,
            productId: product._id,
            rating: Math.floor(Math.random() * 3) + 3,
            title: review.title,
            comment: review.comment,
          });
        } catch { /* skip duplicate reviews */ }
      }

      // Recalculate all product ratings
      for (const product of allProducts) {
        const reviews = await Review.find({ productId: product._id });
        if (reviews.length > 0) {
          const avgRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
          await Product.findByIdAndUpdate(product._id, {
            averageRating: Math.round(avgRating * 10) / 10,
            totalReviews: reviews.length,
          });
        }
      }

      // Create coupons — complete data
      await Coupon.create([
        { code: 'WELCOME10', discount: 10, discountType: 'percentage', minPurchase: 50, isActive: true, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        { code: 'SUMMER20', discount: 20, discountType: 'percentage', minPurchase: 100, maxDiscount: 50, isActive: true, expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
        { code: 'FLAT15', discount: 15, discountType: 'fixed', minPurchase: 75, isActive: true, expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) },
      ]);

      // Create sample orders — complete data with full shipping addresses
      const cities = [
        { city: 'New York', state: 'NY', zip: '10001' },
        { city: 'Los Angeles', state: 'CA', zip: '90001' },
        { city: 'Chicago', state: 'IL', zip: '60601' },
        { city: 'Houston', state: 'TX', zip: '77001' },
        { city: 'Miami', state: 'FL', zip: '33101' },
      ];

      for (let i = 0; i < 5; i++) {
        const user = allUsers[i];
        const userCartItems: any[] = [];
        const numItems = Math.floor(Math.random() * 3) + 1;

        for (let j = 0; j < numItems; j++) {
          const product = allProducts[Math.floor(Math.random() * allProducts.length)];
          userCartItems.push({
            productId: product._id,
            name: product.name,
            image: product.images[0] || '',
            price: product.salePrice || product.price,
            quantity: Math.floor(Math.random() * 2) + 1,
            size: product.sizes[0],
            color: product.colors[0],
          });
        }

        const subtotal = userCartItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
        const shippingCost = subtotal > 100 ? 0 : 9.99;
        const total = subtotal + shippingCost;
        const orderNumber = `ORD-${Date.now() - i * 100000}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const statuses = ['pending', 'processing', 'shipped', 'delivered'];
        const loc = cities[i % cities.length];

        const order = await Order.create({
          userId: user._id,
          orderNumber,
          subtotal,
          shippingCost,
          discount: 0,
          total,
          shippingAddress: {
            firstName: user.name.split(' ')[0],
            lastName: user.name.split(' ').slice(1).join(' ') || '',
            street: `${100 + i} Main Street`,
            city: loc.city,
            state: loc.state,
            zipCode: loc.zip,
            country: 'US',
          },
          shippingMethod: 'standard',
          paymentMethod: 'cod',
          status: statuses[i % statuses.length],
          ...(i % 4 === 3 ? { deliveredAt: new Date() } : {}),
        });

        for (const itemData of userCartItems) {
          await OrderItem.create({ orderId: order._id, ...itemData });
        }
      }

      return NextResponse.json({ success: true, message: 'Database seeded successfully' });
    }

    // No route matched
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// ==================== EXPORT HTTP METHOD HANDLERS ====================

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

export async function PUT(request: NextRequest) {
  return handleRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request);
}

export async function PATCH(request: NextRequest) {
  return handleRequest(request);
}
