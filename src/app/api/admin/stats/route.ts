import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { User, Product, Order, OrderItem } from '@/lib/models';
import { getUserFromRequest, docToObj } from '@/lib/auth-helpers';

// GET /api/admin/stats
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const [totalUsers, totalProducts, totalOrders] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
    ]);

    const totalRevenue = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusMap: any = {};
    ordersByStatus.forEach((item: any) => { statusMap[item._id] = item.count; });

    // Monthly sales data
    const monthlySales = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          sales: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]);

    // Top products
    const topProducts = await OrderItem.aggregate([
      { $group: { _id: '$productId', totalSold: { $sum: '$quantity' } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);

    const topProductsWithData = await Promise.all(topProducts.map(async (item: any) => {
      const product = await Product.findById(item._id).select('name price images');
      return product ? { ...docToObj(product), totalSold: item.totalSold } : null;
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        ordersByStatus: statusMap,
        monthlySales: monthlySales.map((m: any) => ({ month: m._id, sales: m.sales, orders: m.orders })),
        topProducts: topProductsWithData.filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
