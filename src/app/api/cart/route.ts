import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { CartItem } from '@/lib/models';
import { getUserFromRequest, docToObjWithProduct } from '@/lib/auth-helpers';

// GET /api/cart
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const items = await CartItem.find({ userId: user.userId }).populate('productId');
    const cartItems = items.map((item: any) => {
      const obj = docToObjWithProduct(item);
      if (!obj.product && obj.productId) {
        obj.product = {
          id: obj.productId,
          name: 'Unknown Product',
          price: 0,
          salePrice: null,
          images: [],
          stock: 0,
          brand: null,
        };
      }
      return obj;
    }).filter((item: any) => item.product);

    return NextResponse.json({ success: true, data: cartItems });
  } catch (error) {
    console.error('Get cart error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/cart
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { productId, quantity = 1, size, color } = await request.json();
    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    // Check if item already exists in cart
    const existing = await CartItem.findOne({
      userId: user.userId,
      productId,
      size: size || null,
      color: color || null,
    });

    if (existing) {
      existing.quantity += quantity;
      await existing.save();
      await existing.populate('productId');
      return NextResponse.json({ success: true, data: docToObjWithProduct(existing) });
    }

    const cartItem = await CartItem.create({
      userId: user.userId,
      productId,
      quantity,
      size: size || undefined,
      color: color || undefined,
    });
    await cartItem.populate('productId');
    return NextResponse.json({ success: true, data: docToObjWithProduct(cartItem) }, { status: 201 });
  } catch (error) {
    console.error('Add to cart error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
