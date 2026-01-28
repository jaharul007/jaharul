// api/bet.js - Betting System API
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb+srv://alluserdatabase:alluserdatabase@cluster0.bcpe0i1.mongodb.net/BDG_GAME?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri);

export default async function handler(req, res) {
  try {
    await client.connect();
    const db = client.db("BDG_GAME");
    const bets = db.collection("bets");
    const users = db.collection("users");

    // ========================================
    // POST - Place a bet
    // ========================================
    if (req.method === 'POST') {
      const { phone, period, mode, betOn, amount, status, timestamp } = req.body;

      if (!phone || !period || !betOn || !amount) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields" 
        });
      }

      // Verify user has sufficient balance (already deducted in frontend call)
      const user = await users.findOne({ phone });
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      // Create bet document
      const betDoc = {
        phone: phone,
        userId: user.userId || phone,
        period: period,
        mode: mode || 60,
        betOn: betOn,
        amount: parseFloat(amount),
        status: status || 'pending',
        result: null,
        winAmount: 0,
        createdAt: timestamp ? new Date(timestamp) : new Date()
      };

      const result = await bets.insertOne(betDoc);

      return res.status(201).json({
        success: true,
        message: "Bet placed successfully",
        betId: result.insertedId
      });
    }

    // ========================================
    // GET - Get user's betting history
    // ========================================
    if (req.method === 'GET') {
      const { phone, mode } = req.query;

      if (!phone) {
        return res.status(400).json({ 
          success: false, 
          message: "Phone required" 
        });
      }

      const query = { phone };
      if (mode) query.mode = parseInt(mode);

      const userBets = await bets
        .find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      return res.status(200).json({
        success: true,
        bets: userBets
      });
    }

  } catch (e) {
    console.error('Bet API Error:', e);
    res.status(500).json({ 
      success: false, 
      error: e.message 
    });
  }
}