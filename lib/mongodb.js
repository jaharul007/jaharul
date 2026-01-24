import mongoose from 'mongoose';

// Hardcoded string ki jagah process.env ka use karein
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://alluserdatabase:alluserdatabase@cluster0.bcpe0i1.mongodb.net/jaharul-game?retryWrites=true&w=majority&appName=Cluster0";

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside Vercel Settings');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development and across function invocations in Vercel.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // In options ko add karne se connection stable rehta hai
      maxPoolSize: 10, 
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log("=> MongoDB Connected Now");
      return mongooseInstance;
    }).catch((err) => {
      console.error("=> MongoDB Connection Error:", err);
      cached.promise = null; // Reset promise on error
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
