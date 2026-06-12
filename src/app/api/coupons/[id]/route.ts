import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Coupon } from '@/lib/models';
import { getUserFromRequest, docToObj } from '@/lib/auth-helpers';

// PUT /api/coupons/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const coupon = await Coupon.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!coupon) return NextResponse.json({ success: false, error: 'Coupon not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: docToObj(coupon) });
  } catch (error) {
    console.error('Update coupon error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/coupons/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const { id } = await params;
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) return NextResponse.json({ success: false, error: 'Coupon not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Coupon deleted' });
  } catch (error) {
    console.error('Delete coupon error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
