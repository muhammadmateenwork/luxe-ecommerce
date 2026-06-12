import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Review, Product } from '@/lib/models';
import { getUserFromRequest } from '@/lib/auth-helpers';

// DELETE /api/reviews/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const review = await Review.findById(id);
    if (!review) return NextResponse.json({ success: false, error: 'Review not found' }, { status: 404 });

    // Only admin or review owner can delete
    if (user.role !== 'admin' && review.userId.toString() !== user.userId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const productId = review.productId;
    await Review.findByIdAndDelete(id);

    // Update product rating
    const reviews = await Review.find({ productId });
    const avgRating = reviews.length > 0 ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length : 0;
    await Product.findByIdAndUpdate(productId, {
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews: reviews.length,
    });

    return NextResponse.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error('Delete review error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
