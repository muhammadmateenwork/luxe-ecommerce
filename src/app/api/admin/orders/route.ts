import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Order, OrderItem } from '@/lib/models';
import { getUserFromRequest } from '@/lib/auth-helpers';

// GET /api/admin/orders
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name email'),
      Order.countDocuments(filter),
    ]);

    const ordersData = orders.map((o: any) => {
      const obj = o.toObject ? o.toObject() : o;
      const { _id, __v, ...rest } = obj;
      const result: any = { id: _id.toString(), ...rest };

      // Handle populated userId - could be an object or null
      if (result.userId && typeof result.userId === 'object') {
        const uid = result.userId._id;
        if (uid) {
          result.user = {
            id: uid.toString(),
            name: result.userId.name || 'Unknown',
            email: result.userId.email || '',
          };
          result.userId = uid.toString();
        } else {
          result.user = { name: 'Unknown User', email: '' };
          result.userId = null;
        }
      } else if (!result.userId) {
        // Anonymized user (deleted user)
        result.user = { name: 'Deleted User', email: '' };
      }

      // Ensure numeric fields are valid
      result.subtotal = result.subtotal || 0;
      result.shippingCost = result.shippingCost || 0;
      result.discount = result.discount || 0;
      result.total = result.total || 0;

      // Convert ObjectId fields to strings for JSON serialization
      if (result.deliveredAt) result.deliveredAt = new Date(result.deliveredAt).toISOString();
      if (result.cancelledAt) result.cancelledAt = new Date(result.cancelledAt).toISOString();

      return result;
    });

    return NextResponse.json({
      success: true,
      data: {
        orders: ordersData,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('Get admin orders error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}
