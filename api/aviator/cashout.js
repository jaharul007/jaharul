import clientPromise from '../../lib/mongodb.js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // CORS setup same as above...
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { phone, betId, multiplier } = req.body;

    const client = await clientPromise;
    const db = client.db('wingo_game');

    // 1. बेट रिकॉर्ड ढूँढें
    const bet = await db.collection('aviator_bets').findOne({ _id: new ObjectId(betId), status: 'pending' });
    if (!bet) return res.status(400).json({ success: false, message: 'Bet not found or already processed' });

    // 2. जीतने वाली राशि कैलकुलेट करें
    const winAmount = bet.amount * multiplier;

    // 3. यूजर के बैलेंस में पैसे जोड़ें
    const user = await db.collection('users').findOne({ phone });
    const newBalance = (user.balance || 0) + winAmount;

    await db.collection('users').updateOne(
      { phone },
      { 
        $set: { balance: newBalance },
        $inc: { totalWins: 1 }
      }
    );

    // 4. बेट स्टेटस अपडेट करें
    await db.collection('aviator_bets').updateOne(
      { _id: new ObjectId(betId) },
      { $set: { status: 'won', winMultiplier: multiplier, winAmount: winAmount } }
    );

    return res.status(200).json({ success: true, winAmount, newBalance });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Cashout error' });
  }
}
