import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI; 
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

let client;
let clientPromise;

if (!uri) {
  console.error("ERROR: MONGODB_URI is missing in Vercel settings!");
} else {
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
}

export default async function handler(req, res) {
  // CORS Headers (Taaki browser block na kare)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!uri) {
    return res.status(500).json({ error: "MONGODB_URI is not configured in Vercel" });
  }

  try {
    const connectedClient = await clientPromise;
    const db = connectedClient.db("jaharul_game"); 
    const collection = db.collection("game_results");

    if (req.method === 'GET') {
      const { mode } = req.query;
      const history = await collection
        .find({ mode: parseInt(mode) || 60 })
        .sort({ p: -1 }) // Period ID ke hisaab se sort karo
        .limit(20)
        .toArray();
      return res.status(200).json(history);
    }

    if (req.method === 'POST') {
      const { p, n, mode } = req.body;
      if (!p || n === undefined) {
        return res.status(400).json({ error: "Missing data (p or n)" });
      }
      
      const newEntry = {
        p: p,
        n: parseInt(n),
        mode: parseInt(mode) || 60,
        timestamp: new Date()
      };

      const result = await collection.insertOne(newEntry);
      return res.status(201).json({ success: true, id: result.insertedId });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (e) {
    console.error("Database Error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
