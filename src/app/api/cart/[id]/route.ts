import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { CartItem } from '@/lib/models';
import { getUserFromRequest, docToObjWithProduct } from '@/lib/auth-helpers';

// PUT /api/cart/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const { quantity } = await request.json();
    if (!quantity || quantity < 1) {
      return NextResponse.json({ success: false, error: 'Quantity must be at least 1' }, { status: 400 });
    }

    const cartItem = await CartItem.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { quantity },
      { new: true }
    ).populate('productId');

    if (!cartItem) {
      return NextResponse.json({ success: false, error: 'Cart item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: docToObjWithProduct(cartItem) });
  } catch (error) {
    console.error('Update cart error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/cart/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const cartItem = await CartItem.findOneAndDelete({ _id: id, userId: user.userId });
    if (!cartItem) {
      return NextResponse.json({ success: false, error: 'Cart item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error('Delete cart error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
