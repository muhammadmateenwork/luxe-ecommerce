import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { WishlistItem } from '@/lib/models';
import { getUserFromRequest } from '@/lib/auth-helpers';

// DELETE /api/wishlist/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const wishlistItem = await WishlistItem.findOneAndDelete({ _id: id, userId: user.userId });
    if (!wishlistItem) {
      return NextResponse.json({ success: false, error: 'Wishlist item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Delete wishlist error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
