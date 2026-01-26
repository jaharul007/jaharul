import { MongoClient } from 'mongodb';

// Vercel Environment Variables se URI uthayega
const uri = process.env.MONGODB_URI; 
const options = {};

let client;
let clientPromise;

if (!uri) {
  throw new Error('Please add your Mongo URI to Vercel Environment Variables');
}

// Connection pooling for Vercel Serverless
if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("jaharul_game"); // Aapka Database Name
    const collection = db.collection("game_results"); // Aapka Collection Name

    // 1. DATA FETCH KARNA (GET Request)
    if (req.method === 'GET') {
      const { mode } = req.query;
      const history = await collection
        .find({ mode: parseInt(mode) || 60 })
        .sort({ timestamp: -1 }) // Newest result sabse upar
        .limit(20) // Latest 20 results
        .toArray();

      return res.status(200).json(history);
    }

    // 2. DATA SAVE KARNA (POST Request)
    if (req.method === 'POST') {
      const { p, n, mode } = req.body;
      
      const newEntry = {
        p: p, // Period ID
        n: parseInt(n), // Winning Number
        mode: parseInt(mode), // 30, 60, 180, etc.
        timestamp: new Date() // Original time of saving
      };

      const result = await collection.insertOne(newEntry); // MongoDB mein save
      return res.status(201).json({ message: "Saved Successfully", id: result.insertedId });
    }

    return res.status(405).json({ message: "Method not allowed" });

  } catch (e) {
    console.error("MongoDB Error:", e);
    return res.status(500).json({ error: "Failed to connect to original storage" });
  }
}
