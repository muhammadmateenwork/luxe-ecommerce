import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Order, OrderItem, CartItem, Coupon } from '@/lib/models';
import { getUserFromRequest, docToObjWithUser, itemToObj } from '@/lib/auth-helpers';

// GET /api/orders
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const filter: any = { userId: user.userId };
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name email'),
      Order.countDocuments(filter),
    ]);

    const ordersWithItems = await Promise.all(orders.map(async (order: any) => {
      const items = await OrderItem.find({ orderId: order._id });
      const orderObj = docToObjWithUser(order);
      orderObj.items = items.map(itemToObj);
      return orderObj;
    }));

    return NextResponse.json({
      success: true,
      data: {
        orders: ordersWithItems,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/orders
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { shippingAddress, paymentMethod = 'cod', couponCode, shippingMethod = 'standard' } = await request.json();

    // Get cart items
    const cartItems = await CartItem.find({ userId: user.userId }).populate('productId');
    if (cartItems.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 });
    }

    let subtotal = 0;
    const orderItemsData = cartItems.map((item: any) => {
      const product = item.productId;
      const price = product.salePrice || product.price;
      subtotal += price * item.quantity;
      return {
        productId: product._id,
        name: product.name,
        image: product.images[0] || '',
        price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      };
    });

    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon) {
        if (coupon.expiresAt && coupon.expiresAt < new Date()) {
          return NextResponse.json({ success: false, error: 'Coupon has expired' }, { status: 400 });
        }
        if (coupon.minPurchase && subtotal < coupon.minPurchase) {
          return NextResponse.json({ success: false, error: `Minimum purchase of $${coupon.minPurchase} required` }, { status: 400 });
        }
        if (coupon.discountType === 'percentage') {
          discount = subtotal * (coupon.discount / 100);
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
          }
        } else {
          discount = coupon.discount;
        }
        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    // Calculate shipping cost based on method
    let shippingCost: number;
    switch (shippingMethod) {
      case 'express':
        shippingCost = 19.99;
        break;
      case 'international':
        shippingCost = 24.99;
        break;
      case 'standard':
      default:
        shippingCost = subtotal > 100 ? 0 : 9.99;
        break;
    }
    const total = subtotal - discount + shippingCost;
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const order = await Order.create({
      userId: user.userId,
      orderNumber,
      subtotal,
      shippingCost,
      discount,
      total,
      shippingAddress,
      shippingMethod,
      paymentMethod,
    });

    // Create order items
    for (const itemData of orderItemsData) {
      await OrderItem.create({ orderId: order._id, ...itemData });
    }

    // Clear cart
    await CartItem.deleteMany({ userId: user.userId });

    return NextResponse.json({ success: true, data: { orderId: order._id, orderNumber } }, { status: 201 });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
