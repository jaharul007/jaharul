import { MongoClient } from 'mongodb';

// Vercel Environment Variables se URI uthayega
const uri = process.env.MONGODB_URI; 
const options = {};

let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

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
    const db = client.db("jaharul_game"); // Apne DB ka naam check kar lena
    const { mode } = req.query;

    if (req.method === 'GET') {
      // Database se latest 10 results nikalna
      const history = await db
        .collection("game_results")
        .find({ mode: parseInt(mode) || 60 })
        .sort({ timestamp: -1 }) // Newest first
        .limit(10)
        .toArray();

      return res.status(200).json(history);
    }

    if (req.method === 'POST') {
      // Naya result save karne ke liye (Timer ke through)
      const { p, n, mode } = req.body;
      const newResult = {
        p,
        n: parseInt(n),
        mode: parseInt(mode),
        timestamp: new Date()
      };

      await db.collection("game_results").insertOne(newResult);
      return res.status(201).json(newResult);
    }

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database connection failed" });
  }
}
