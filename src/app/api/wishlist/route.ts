import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { WishlistItem } from '@/lib/models';
import { getUserFromRequest, docToObjWithProduct } from '@/lib/auth-helpers';

// GET /api/wishlist
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const items = await WishlistItem.find({ userId: user.userId }).populate('productId');
    const wishlistItems = items.map((item: any) => {
      const obj = docToObjWithProduct(item);
      if (!obj.product && obj.productId) {
        obj.product = {
          id: obj.productId,
          name: 'Unknown Product',
          slug: '',
          price: 0,
          salePrice: null,
          images: [],
          stock: 0,
          brand: null,
          averageRating: 0,
          totalReviews: 0,
        };
      }
      return obj;
    }).filter((item: any) => item.product);

    return NextResponse.json({ success: true, data: wishlistItems });
  } catch (error) {
    console.error('Get wishlist error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/wishlist
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { productId } = await request.json();
    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    const existing = await WishlistItem.findOne({ userId: user.userId, productId });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Product already in wishlist' }, { status: 400 });
    }

    const wishlistItem = await WishlistItem.create({ userId: user.userId, productId });
    await wishlistItem.populate('productId');
    return NextResponse.json({ success: true, data: docToObjWithProduct(wishlistItem) }, { status: 201 });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
