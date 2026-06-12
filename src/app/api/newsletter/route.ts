import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Newsletter } from '@/lib/models';

// POST /api/newsletter
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { email } = await request.json();
    if (!email) return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });

    const existing = await Newsletter.findOne({ email: email.toLowerCase() });
    if (existing) return NextResponse.json({ success: true, message: 'Already subscribed' });

    await Newsletter.create({ email: email.toLowerCase() });
    return NextResponse.json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Newsletter error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
