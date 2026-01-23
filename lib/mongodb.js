import mongoose from 'mongoose';

// Vercel Environment Variables से MongoDB URL लेना
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'कृपया Vercel Settings में MONGODB_URI डिफाइन करें'
  );
}

/**
 * Global एक ऐसी जगह है जहाँ हम कनेक्शन को सेव करते हैं 
 * ताकि हर बार नया कनेक्शन न बनाना पड़े (Serverless के लिए जरूरी है)
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
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log("MongoDB Connected Successfully!");
      return mongoose;
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
