import mongoose from 'mongoose';

let cached = null;

export default async function connectDB() {
  if (cached) return cached;

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
    cached = conn;
    console.log('✅ Connected to MongoDB Atlas');
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}
