import clientPromise from '../../lib/mongodb.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const { phone, amount, roundId } = req.body;

    if (!phone || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid bet details' });
    }

    const client = await clientPromise;
    const db = client.db('wingo_game');

    // 1. यूजर का बैलेंस चेक करें
    const user = await db.collection('users').findOne({ phone });
    if (!user || user.balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // 2. बैलेंस काटें और यूजर डेटा अपडेट करें
    const newBalance = user.balance - amount;
    await db.collection('users').updateOne(
      { phone },
      { 
        $set: { balance: newBalance },
        $inc: { totalBets: 1 } 
      }
    );

    // 3. बेट का रिकॉर्ड सेव करें
    const betRecord = {
      phone,
      amount,
      roundId,
      status: 'pending',
      timestamp: new Date()
    };
    const result = await db.collection('aviator_bets').insertOne(betRecord);

    return res.status(200).json({
      success: true,
      message: 'Bet placed successfully',
      betId: result.insertedId,
      newBalance: newBalance
    });

  } catch (error) {
    console.error('❌ Bet API Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
