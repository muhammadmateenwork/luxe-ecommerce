import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'luxe-ecommerce-jwt-secret-key-2024-production';

// POST /api/auth/forgot-password
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }
    // In production, send email with reset link
    const resetToken = jwt.sign({ email, purpose: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
    return NextResponse.json({ success: true, message: 'Password reset email sent', resetToken });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
