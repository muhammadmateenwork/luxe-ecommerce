import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'luxe-ecommerce-jwt-secret-key-2024-production';

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  // Also check cookies
  const cookieToken = req.headers.cookie?.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
  const finalToken = token || cookieToken;

  if (!finalToken) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  const decoded = verifyToken(finalToken);
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}

export function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}
