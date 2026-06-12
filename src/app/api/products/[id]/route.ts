import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Product, Review, CartItem, WishlistItem, OrderItem, RecentlyViewed } from '@/lib/models';
import { getUserFromRequest, docToObjWithCategory } from '@/lib/auth-helpers';
import mongoose from 'mongoose';

// Helper: recalculate a product's averageRating and totalReviews
async function recalculateProductRating(productId: string) {
  const stats = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg = stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;
  const total = stats.length > 0 ? stats[0].count : 0;
  await Product.findByIdAndUpdate(productId, { averageRating: avg, totalReviews: total });
}

// GET /api/products/:id
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const product = await Product.findById(id).populate('categoryId', 'name slug');
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: docToObjWithCategory(product) });
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PUT /api/products/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const { id } = await params;
    const updateData = await request.json();
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.salePrice) updateData.salePrice = parseFloat(updateData.salePrice);
    if (updateData.stock) updateData.stock = parseInt(updateData.stock);

    const product = await Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('categoryId', 'name slug');
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: docToObjWithCategory(product) });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE /api/products/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const { id } = await params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Cascade: delete all related data for this product
    const [reviewsResult, cartResult, wishlistResult, recentlyResult, orderItemsResult] = await Promise.all([
      Review.deleteMany({ productId: id }),
      CartItem.deleteMany({ productId: id }),
      WishlistItem.deleteMany({ productId: id }),
      RecentlyViewed.deleteMany({ productId: id }),
      // Nullify productId in OrderItems to preserve order history
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
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete product' }, { status: 500 });
  }
}
