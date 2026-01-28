// api/history.js - Game History API
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb+srv://alluserdatabase:alluserdatabase@cluster0.bcpe0i1.mongodb.net/BDG_GAME?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri);

export default async function handler(req, res) {
  try {
    await client.connect();
    const db = client.db("BDG_GAME");
    const gameResults = db.collection("game_results");

    if (req.method === 'GET') {
      const { mode, page = 1 } = req.query;
      const limit = 10;
      const skip = (parseInt(page) - 1) * limit;

      const query = mode ? { mode: parseInt(mode) } : {};

      const results = await gameResults
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      // Format for frontend
      const formatted = results.map(r => ({
        p: r.period,
        n: r.number,
        mode: r.mode
      }));

      return res.status(200).json(formatted);
    }

  } catch (e) {
    console.error('History API Error:', e);
    res.status(500).json({ 
      success: false, 
      error: e.message 
    });
  }
}