import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { DeliveryMethod } from '@/lib/models';
import { getUserFromRequest, docToObj } from '@/lib/auth-helpers';

// GET /api/delivery-methods
export async function GET() {
  try {
    await connectDB();
    const methods = await DeliveryMethod.find({ isActive: true }).sort({ order: 1, price: 1 });
    return NextResponse.json({
      success: true,
      data: methods.map(docToObj),
    });
  } catch (error) {
    console.error('Get delivery methods error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch delivery methods' }, { status: 500 });
  }
}

// POST /api/delivery-methods
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const body = await request.json();
    const { name, description, price, freeOverAmount, estimatedDays, isActive, order } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ success: false, error: 'Name and price are required' }, { status: 400 });
    }

    const method = await DeliveryMethod.create({
      name,
      description: description || '',
      price: parseFloat(price),
      freeOverAmount: freeOverAmount ? parseFloat(freeOverAmount) : undefined,
      estimatedDays: estimatedDays || '',
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0,
    });

    return NextResponse.json({ success: true, data: docToObj(method) }, { status: 201 });
  } catch (error) {
    console.error('Create delivery method error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create delivery method' }, { status: 500 });
  }
}
