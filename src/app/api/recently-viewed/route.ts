import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Product, RecentlyViewed } from '@/lib/models';
import { getUserFromRequest } from '@/lib/auth';

function docToObject(doc: any) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  return { id: _id.toString(), ...rest };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const tokenUser = await getUserFromRequest(request);
    if (!tokenUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const recentlyViewed = await RecentlyViewed.find({ userId: tokenUser.userId })
      .populate({
        path: 'productId',
        select: 'name slug price salePrice images brand averageRating totalReviews',
      })
      .sort({ viewedAt: -1 })
      .limit(10);

    // Transform results - images are already arrays in MongoDB, no JSON.parse needed
    const parsedItems = recentlyViewed.map((item) => {
      const obj = docToObject(item);
      if (obj.productId && typeof obj.productId === 'object') {
        obj.product = docToObject(obj.productId);
        delete obj.productId;
      }
      return obj;
    });

    return NextResponse.json({ success: true, data: parsedItems });
  } catch (error) {
    console.error('Get recently viewed error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const tokenUser = await getUserFromRequest(request);
    if (!tokenUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if already exists
    const existing = await RecentlyViewed.findOne({
      userId: tokenUser.userId,
      productId,
    });

    if (existing) {
      await RecentlyViewed.findByIdAndUpdate(existing._id, { viewedAt: new Date() });
    } else {
      await RecentlyViewed.create({
        userId: tokenUser.userId,
        productId,
      });
    }

    return NextResponse.json(
      { success: true, message: 'Product added to recently viewed' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Add recently viewed error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
