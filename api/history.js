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
  // CORS Headers
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

    // --- GET METHOD: Alag-Alag History Load Karne Ke Liye ---
    if (req.method === 'GET') {
      const { mode } = req.query;
      // Agar frontend mode bhejta hai (30, 60, 180, 300) toh ussi ka data dikhao
      const queryMode = mode ? parseInt(mode) : 60;

      const history = await collection
        .find({ mode: queryMode }) // Filter by Mode
        .sort({ p: -1 }) // Naya period sabse upar
        .limit(20) // Top 20 results
        .toArray();
      return res.status(200).json(history);
    }

    // --- POST METHOD: Naya Result Save Karne Ke Liye ---
    if (req.method === 'POST') {
      const { p, n, mode } = req.body;
      
      if (!p || n === undefined) {
        return res.status(400).json({ error: "Missing period (p) or number (n)" });
      }

      const newEntry = {
        p: p,
        n: parseInt(n),
        mode: parseInt(mode) || 60, // Mode save karna zaroori hai
        timestamp: new Date()
      };

      // Check if period already exists for this mode (Duplicate rokne ke liye)
      const exists = await collection.findOne({ p: p, mode: parseInt(mode) });
      if (exists) {
        return res.status(200).json({ message: "Already exists" });
      }

      const result = await collection.insertOne(newEntry);
      return res.status(201).json({ success: true, id: result.insertedId });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (e) {
    console.error("Database Error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
