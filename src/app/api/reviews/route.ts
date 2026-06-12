import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Review, Product } from '@/lib/models';
import { getUserFromRequest, docToObjWithUser } from '@/lib/auth-helpers';

// GET /api/reviews
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';

    const filter: any = {};
    if (productId) filter.productId = productId;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

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
  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/reviews
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { productId, rating, title, comment } = await request.json();
    if (!productId || !rating) {
      return NextResponse.json({ success: false, error: 'Product ID and rating are required' }, { status: 400 });
    }

    // Check if user already reviewed this product
    const existing = await Review.findOne({ userId: user.userId, productId });
    if (existing) {
      return NextResponse.json({ success: false, error: 'You have already reviewed this product' }, { status: 400 });
    }

    const review = await Review.create({
      userId: user.userId, productId, rating, title, comment,
    });

    // Update product rating
    const reviews = await Review.find({ productId });
    const avgRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
    await Product.findByIdAndUpdate(productId, {
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews: reviews.length,
    });

    await review.populate('userId', 'name avatar');
    return NextResponse.json({ success: true, data: docToObjWithUser(review) }, { status: 201 });
  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
