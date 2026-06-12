import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { User, Review, CartItem, WishlistItem, RecentlyViewed, Order, Product } from '@/lib/models';
import { getUserFromRequest, docToObjUser } from '@/lib/auth-helpers';
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

// PUT /api/admin/users/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const { id } = await params;
    const dbUser = await User.findById(id);
    if (!dbUser) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    // Toggle block status
    dbUser.isBlocked = !dbUser.isBlocked;
    await dbUser.save();

    return NextResponse.json({ success: true, data: docToObjUser(dbUser) });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/admin/users/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const { id } = await params;

    // Prevent admin from deleting themselves
    if (user.userId === id) {
      return NextResponse.json({ success: false, error: 'Cannot delete your own account' }, { status: 400 });
    }

    const dbUser = await User.findByIdAndDelete(id);
    if (!dbUser) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    // Find all reviews by this user to know which product ratings need recalculation
    const userReviews = await Review.find({ userId: id }).select('productId');
    const affectedProductIds = [...new Set(userReviews.map((r) => r.productId.toString()))];

    // Cascade: delete all user-related data
    const [reviewsResult, cartResult, wishlistResult, recentlyResult, ordersResult] = await Promise.all([
      Review.deleteMany({ userId: id }),
      CartItem.deleteMany({ userId: id }),
      WishlistItem.deleteMany({ userId: id }),
      RecentlyViewed.deleteMany({ userId: id }),
      // Anonymize orders: keep them but set userId to null
      Order.updateMany({ userId: id }, { $set: { userId: null } }),
    ]);

    // Recalculate ratings for all affected products
    await Promise.all(affectedProductIds.map((pid) => recalculateProductRating(pid)));

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
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 });
  }
}
