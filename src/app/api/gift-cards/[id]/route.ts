import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { GiftCard } from '@/lib/models';
import { getUserFromRequest, docToObj } from '@/lib/auth-helpers';

// PUT /api/gift-cards/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price !== undefined) updateData.price = parseFloat(body.price);
    if (body.salePrice !== undefined) updateData.salePrice = body.salePrice ? parseFloat(body.salePrice) : null;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const giftCard = await GiftCard.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!giftCard) {
      return NextResponse.json({ success: false, error: 'Gift card not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: docToObj(giftCard) });
  } catch (error) {
    console.error('Update gift card error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update gift card' }, { status: 500 });
  }
}

// DELETE /api/gift-cards/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const { id } = await params;
    const giftCard = await GiftCard.findByIdAndDelete(id);
    if (!giftCard) {
      return NextResponse.json({ success: false, error: 'Gift card not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Gift card deleted' });
  } catch (error) {
    console.error('Delete gift card error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete gift card' }, { status: 500 });
  }
}
