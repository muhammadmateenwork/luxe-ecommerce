import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Category, Product, Review, CartItem, WishlistItem, OrderItem, RecentlyViewed } from '@/lib/models';
import { getUserFromRequest, docToObj } from '@/lib/auth-helpers';

// PUT /api/categories/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const category = await Category.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!category) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: docToObj(category) });
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/categories/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const { id } = await params;
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }

    // Find all products in this category
    const productsInCategory = await Product.find({ categoryId: id }).select('_id');
    const productIds = productsInCategory.map((p) => p._id);

    if (productIds.length > 0) {
      // Delete all related data for these products
      await Promise.all([
        Review.deleteMany({ productId: { $in: productIds } }),
        CartItem.deleteMany({ productId: { $in: productIds } }),
        WishlistItem.deleteMany({ productId: { $in: productIds } }),
        RecentlyViewed.deleteMany({ productId: { $in: productIds } }),
        // Nullify product references in order items (keep order history intact)
        OrderItem.updateMany({ productId: { $in: productIds } }, { $set: { productId: null } }),
      ]);

      // Delete the products themselves
      await Product.deleteMany({ categoryId: id });
    }

    return NextResponse.json({
      success: true,
      message: `Category deleted along with ${productIds.length} product(s) and their related data`,
      data: { deletedProducts: productIds.length },
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
