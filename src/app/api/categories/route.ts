import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Category, Product } from '@/lib/models';
import { getUserFromRequest, docToObj } from '@/lib/auth-helpers';

// GET /api/categories
export async function GET() {
  try {
    await connectDB();
    const categories = await Category.find().sort({ name: 1 });
    const categoriesWithCount = await Promise.all(categories.map(async (cat) => {
      const productCount = await Product.countDocuments({ categoryId: cat._id });
      return { ...docToObj(cat), _count: { products: productCount } };
    }));
    return NextResponse.json({ success: true, data: categoriesWithCount });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/categories
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const body = await request.json();
    const { name, slug, description, image } = body;
    if (!name || !slug) {
      return NextResponse.json({ success: false, error: 'Name and slug are required' }, { status: 400 });
    }
    const category = await Category.create({ name, slug, description, image });
    return NextResponse.json({ success: true, data: docToObj(category) }, { status: 201 });
  } catch (error: any) {
    console.error('Create category error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: 'Category with this name or slug already exists' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
