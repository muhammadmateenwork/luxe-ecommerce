import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { GiftCard } from '@/lib/models';
import { getUserFromRequest, docToObj } from '@/lib/auth-helpers';

// GET /api/gift-cards
export async function GET() {
  try {
    await connectDB();
    const giftCards = await GiftCard.find({ isActive: true }).sort({ price: 1 });
    return NextResponse.json({
      success: true,
      data: giftCards.map(docToObj),
    });
  } catch (error) {
    console.error('Get gift cards error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch gift cards' }, { status: 500 });
  }
}

// POST /api/gift-cards
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const body = await request.json();
    const { name, description, price, salePrice, image, isActive } = body;

    if (!name || !price) {
      return NextResponse.json({ success: false, error: 'Name and price are required' }, { status: 400 });
    }

    const giftCard = await GiftCard.create({
      name,
      description: description || '',
      price: parseFloat(price),
      salePrice: salePrice ? parseFloat(salePrice) : undefined,
      image: image || '',
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json({ success: true, data: docToObj(giftCard) }, { status: 201 });
  } catch (error) {
    console.error('Create gift card error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create gift card' }, { status: 500 });
  }
}
