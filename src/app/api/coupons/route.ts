import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Coupon } from '@/lib/models';
import { getUserFromRequest, docToObj } from '@/lib/auth-helpers';

// GET /api/coupons
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

    const [coupons, total] = await Promise.all([
      Coupon.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Coupon.countDocuments(),
    ]);

    return NextResponse.json({
      success: true,
      data: { coupons: coupons.map(docToObj), pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/coupons
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const body = await request.json();
    const coupon = await Coupon.create(body);
    return NextResponse.json({ success: true, data: docToObj(coupon) }, { status: 201 });
  } catch (error: any) {
    console.error('Create coupon error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: 'Coupon code already exists' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
