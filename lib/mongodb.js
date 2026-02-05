import { MongoClient } from 'mongodb';

// यह दोनों में से जो भी वेरिएबल मिलेगा उसे उठा लेगा
const uri = process.env.MONGODB_URI || process.env.MONGO_URI; 
const options = {};

let client;
let clientPromise;

if (!uri) {
  throw new Error('Please add your Mongo URI to Vercel environment variables as MONGODB_URI or MONGO_URI');
}

if (process.env.NODE_ENV === 'development') {
  // Development मोड में global variable का इस्तेमाल करते हैं ताकि hot reload पर कनेक्शन बार-बार न खुले
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // Production (Vercel) के लिए सीधा कनेक्शन
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
