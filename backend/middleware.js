const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'luxe-ecommerce-jwt-secret-key-2024-production';

// Helper: convert Mongoose doc to plain object with id field
function docToObj(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  return { id: _id.toString(), ...rest };
}

function docToObjUser(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, password, resetPasswordToken, resetPasswordExpires, ...rest } = obj;
  return { id: _id.toString(), ...rest };
}

function docToObjWithProduct(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  const result = { id: _id.toString(), ...rest };
  if (result.productId && typeof result.productId === 'object' && result.productId._id) {
    const { _id: pid, __v: pv, ...productData } = result.productId.toObject ? result.productId.toObject() : result.productId;
    result.product = { id: pid.toString(), ...productData };
    result.productId = pid.toString();
  }
  return result;
}

function docToObjWithCategory(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  const result = { id: _id.toString(), ...rest };
  if (result.categoryId && typeof result.categoryId === 'object' && result.categoryId._id) {
    result.categoryId = docToObj(result.categoryId);
  }
  return result;
}

function docToObjWithUser(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  const result = { id: _id.toString(), ...rest };
  if (result.userId && typeof result.userId === 'object' && result.userId._id) {
    const { _id: uid, __v: uv, password, ...userData } = result.userId.toObject ? result.userId.toObject() : result.userId;
    result.user = { id: uid.toString(), ...userData };
    result.userId = uid.toString();
  }
  return result;
}

function itemToObj(item) {
  const obj = item.toObject ? item.toObject() : item;
  const { _id, __v, ...rest } = obj;
  return { id: _id.toString(), ...rest };
}

// Auth middleware: extracts user from Authorization header
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, email, role }
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

// Optional auth: sets req.user if token present, but doesn't require it
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {}
  }
  next();
}

// Admin middleware: requires auth + admin role
function adminMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}

module.exports = {
  docToObj, docToObjUser, docToObjWithProduct, docToObjWithCategory,
  docToObjWithUser, itemToObj,
  authMiddleware, optionalAuth, adminMiddleware,
};
