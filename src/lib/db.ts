import mongoose from 'mongoose';

let isConnected = false;

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'MONGODB_URI environment variable is not defined. Please add it to your .env file:\n' +
    'MONGODB_URI=mongodb+srv://muhammadmateen543_db_user:83ACH4vG@cluster0.uk5yimz.mongodb.net/?appName=Cluster0'
  );
}

export default async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;

  // If already connecting, wait for the connection
  if (mongoose.connection.readyState === 2) {
    await new Promise<void>((resolve) => {
      mongoose.connection.once('open', () => resolve());
      setTimeout(() => resolve(), 10000); // 10s timeout
    });
    isConnected = mongoose.connection.readyState === 1;
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
    });
    isConnected = true;
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}
