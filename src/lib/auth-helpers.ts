import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'luxe-ecommerce-jwt-secret-key-2024-production';

export async function getUserFromRequest(request: NextRequest) {
  const token = request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
  } catch { return null; }
}

export function docToObj(doc: any) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  return { id: _id.toString(), ...rest };
}

export function docToObjUser(doc: any) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, password, resetPasswordToken, resetPasswordExpires, ...rest } = obj;
  return { id: _id.toString(), ...rest };
}

export function docToObjWithProduct(doc: any) {
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

export function docToObjWithCategory(doc: any) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  const result = { id: _id.toString(), ...rest };
  if (result.categoryId && typeof result.categoryId === 'object' && result.categoryId._id) {
    result.categoryId = docToObj(result.categoryId);
  }
  return result;
}

export function docToObjWithUser(doc: any) {
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

export function itemToObj(item: any) {
  const obj = item.toObject ? item.toObject() : item;
  const { _id, __v, ...rest } = obj;
  return { id: _id.toString(), ...rest };
}
