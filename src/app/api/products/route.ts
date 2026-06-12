import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Product } from '@/lib/models';
import { getUserFromRequest, docToObjWithCategory } from '@/lib/auth-helpers';

// GET /api/products
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sizes = searchParams.get('sizes');
    const colors = searchParams.get('colors');
    const rating = searchParams.get('rating');
    const sort = searchParams.get('sort') || 'newest';
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '12';
    const featured = searchParams.get('featured');
    const newArrival = searchParams.get('newArrival');
    const bestSeller = searchParams.get('bestSeller');
    const trending = searchParams.get('trending');
    const flashSale = searchParams.get('flashSale');
    const onSale = searchParams.get('onSale');

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }
    if (minPrice || maxPrice) {
      const priceFilter: any = {};
      if (minPrice) priceFilter.$gte = parseFloat(minPrice);
      if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
      filter.price = priceFilter;
    }
    if (featured === 'true') filter.isFeatured = true;
    if (newArrival === 'true') filter.isNewArrival = true;
    if (bestSeller === 'true') filter.isBestSeller = true;
    if (trending === 'true') filter.isTrending = true;
    if (flashSale === 'true') {
      filter.isFlashSale = true;
      filter.flashSaleEnds = { $gt: new Date() };
    }
    if (onSale === 'true') filter.salePrice = { $ne: null, $gt: 0 };
    if (sizes) filter.sizes = { $in: sizes.split(',').map((s: string) => s.trim()) };
    if (colors) filter.colors = { $in: colors.split(',').map((c: string) => c.trim()) };
    if (rating) filter.averageRating = { $gte: parseFloat(rating) };

    let sortObj: any = {};
    switch (sort) {
      case 'price_asc': sortObj = { price: 1 }; break;
      case 'price_desc': sortObj = { price: -1 }; break;
      case 'newest': sortObj = { createdAt: -1 }; break;
      case 'popular': sortObj = { totalReviews: -1 }; break;
      case 'top_rated': sortObj = { averageRating: -1 }; break;
      default: sortObj = { createdAt: -1 };
    }

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortObj).skip(skip).limit(limitNum).populate('categoryId', 'name slug'),
      Product.countDocuments(filter),
    ]);

    // For flash sale queries, include the earliest flashSaleEnds timestamp
    let flashSaleEndsAt: string | null = null;
    if (flashSale === 'true' && products.length > 0) {
      // Find the product with the earliest flashSaleEnds
      const earliestProduct = products.reduce((earliest: any, p: any) => {
        const pEnd = p.flashSaleEnds ? new Date(p.flashSaleEnds).getTime() : Infinity;
        const eEnd = earliest ? (earliest.flashSaleEnds ? new Date(earliest.flashSaleEnds).getTime() : Infinity) : Infinity;
        return pEnd < eEnd ? p : earliest;
      }, products[0]);
      if (earliestProduct?.flashSaleEnds) {
        flashSaleEndsAt = new Date(earliestProduct.flashSaleEnds).toISOString();
      }
    }

    const responseData: any = {
      products: products.map(docToObjWithCategory),
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    };
    if (flashSaleEndsAt) {
      responseData.flashSaleEndsAt = flashSaleEndsAt;
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/products
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const body = await request.json();
    const { name, slug, description, brand, price, salePrice, sku, stock, sizes, colors, images, categoryId, category, isFeatured, isNewArrival, isBestSeller, isTrending, isFlashSale, flashSaleEnds } = body;

    if (!name || !slug || !description || !brand || !price || !sku || !categoryId || !category) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await Product.findOne({ $or: [{ slug }, { sku }] });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Product with this slug or SKU already exists' }, { status: 400 });
    }

    const product = await Product.create({
      name, slug, description, brand, price: parseFloat(price),
      salePrice: salePrice ? parseFloat(salePrice) : undefined,
      sku, stock: stock || 0, sizes: sizes || [], colors: colors || [], images: images || [],
      categoryId, category, isFeatured: isFeatured || false, isNewArrival: isNewArrival || false,
      isBestSeller: isBestSeller || false, isTrending: isTrending || false,
      isFlashSale: isFlashSale || false, flashSaleEnds: flashSaleEnds ? new Date(flashSaleEnds) : undefined,
    });

    await product.populate('categoryId', 'name slug');
    return NextResponse.json({ success: true, data: docToObjWithCategory(product) }, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
