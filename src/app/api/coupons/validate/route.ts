import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Coupon } from '@/lib/models';
import { getUserFromRequest } from '@/lib/auth-helpers';

// POST /api/coupons/validate
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { code, cartTotal } = await request.json();
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

    return NextResponse.json({
      success: true,
      data: { discount, code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discount },
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
