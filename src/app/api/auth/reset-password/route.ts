import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { User } from '@/lib/models';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'luxe-ecommerce-jwt-secret-key-2024-production';

// POST /api/auth/reset-password
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { token, newPassword } = await request.json();
    if (!token || !newPassword) {
      return NextResponse.json({ success: false, error: 'Token and new password are required' }, { status: 400 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 400 });
    }

    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    return NextResponse.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 400 });
  }
}
