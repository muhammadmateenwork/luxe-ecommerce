import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Review, Product } from '@/lib/models';
import { getUserFromRequest } from '@/lib/auth-helpers';
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

// DELETE /api/admin/reviews/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const { id } = await params;
    const review = await Review.findByIdAndDelete(id);
    if (!review) return NextResponse.json({ success: false, error: 'Review not found' }, { status: 404 });

    // Recalculate the product's averageRating and totalReviews
    await recalculateProductRating(review.productId.toString());

    return NextResponse.json({ success: true, message: 'Review deleted', data: { productId: review.productId.toString() } });
  } catch (error) {
    console.error('Delete review error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete review' }, { status: 500 });
  }
}
