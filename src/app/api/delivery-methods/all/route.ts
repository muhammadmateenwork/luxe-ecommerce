import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { DeliveryMethod } from '@/lib/models';
import { getUserFromRequest, docToObj } from '@/lib/auth-helpers';

// GET /api/delivery-methods/all (admin - includes inactive)
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const methods = await DeliveryMethod.find().sort({ order: 1, price: 1 });
    return NextResponse.json({
      success: true,
      data: methods.map(docToObj),
    });
  } catch (error) {
    console.error('Get all delivery methods error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch delivery methods' }, { status: 500 });
  }
}
