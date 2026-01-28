import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error('❌ Please add MONGODB_URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
  // Development: use global variable to preserve connection
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
    console.log('🔗 MongoDB connection initialized (development)');
  }
  clientPromise = global._mongoClientPromise;
} else {
  // Production: create new connection
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
  console.log('🔗 MongoDB connection initialized (production)');
}