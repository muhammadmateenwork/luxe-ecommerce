import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { DeliveryMethod } from '@/lib/models';
import { getUserFromRequest, docToObj } from '@/lib/auth-helpers';

// PUT /api/delivery-methods/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price !== undefined) updateData.price = parseFloat(body.price);
    if (body.freeOverAmount !== undefined) updateData.freeOverAmount = body.freeOverAmount ? parseFloat(body.freeOverAmount) : null;
    if (body.estimatedDays !== undefined) updateData.estimatedDays = body.estimatedDays;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.order !== undefined) updateData.order = parseInt(body.order);

    const method = await DeliveryMethod.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!method) {
      return NextResponse.json({ success: false, error: 'Delivery method not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: docToObj(method) });
  } catch (error) {
    console.error('Update delivery method error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update delivery method' }, { status: 500 });
  }
}

// DELETE /api/delivery-methods/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const { id } = await params;
    const method = await DeliveryMethod.findByIdAndDelete(id);
    if (!method) {
      return NextResponse.json({ success: false, error: 'Delivery method not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Delivery method deleted' });
  } catch (error) {
    console.error('Delete delivery method error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete delivery method' }, { status: 500 });
  }
}
