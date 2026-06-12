import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Review } from '@/lib/models';
import { getUserFromRequest } from '@/lib/auth-helpers';

// GET /api/admin/reviews
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const { searchParams } = new URL(request.url);
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
  } catch (error) {
    console.error('Get admin reviews error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
