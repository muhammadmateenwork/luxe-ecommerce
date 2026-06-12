import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { GiftCard } from '@/lib/models';
import { getUserFromRequest, docToObj } from '@/lib/auth-helpers';

// GET /api/gift-cards/all (admin - includes inactive)
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const giftCards = await GiftCard.find().sort({ price: 1 });
    return NextResponse.json({
      success: true,
      data: giftCards.map(docToObj),
    });
  } catch (error) {
    console.error('Get all gift cards error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch gift cards' }, { status: 500 });
  }
}
