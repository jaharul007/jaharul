import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });
  
  try {
    const { phone, period, mode, betOn, amount, betType, multiplier } = req.body;
    
    // 1. Validation - Amount ko Number mein convert karna zaroori hai
    const betAmount = parseFloat(amount);
    if (!phone || !period || isNaN(betAmount) || betAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid bet details' });
    }
    
    const client = await clientPromise;
    const db = client.db('wingo_game');
    
    // 2. Atomic Update (Balance check aur deduct ek saath)
    // Yeh sabse safe tareeka hai: Sirf tabhi deduct karo jab balance >= betAmount ho
    const updateResult = await db.collection('users').updateOne(
      { phone: phone, balance: { $gte: betAmount } }, 
      { 
        $inc: { balance: -betAmount, totalBets: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    // Agar nMatched 0 hai, matlab balance kam hai ya user nahi mila
    if (updateResult.matchedCount === 0) {
      const userCheck = await db.collection('users').findOne({ phone });
      if (!userCheck) return res.status(404).json({ success: false, message: 'User not found' });
      return res.status(400).json({ success: false, message: 'Insufficient balance!' });
    }
    
    // 3. Create bet document
    const betData = {
      phone,
      period,
      mode: parseInt(mode),
      betOn: String(betOn),
      betType: betType || 'number',
      amount: betAmount,
      multiplier: multiplier || 1,
      status: 'pending',
      result: null,
      winAmount: 0,
      timestamp: new Date()
    };
    
    await db.collection('bets').insertOne(betData);
    
    // Naya balance fetch karna frontend ko dikhane ke liye
    const updatedUser = await db.collection('users').findOne({ phone });
    
    console.log(`✅ Bet placed: ${phone} - ₹${betAmount} on ${betOn}`);
    
    return res.status(200).json({
      success: true,
      message: 'Bet placed successfully',
      newBalance: updatedUser.balance,
      betId: betData._id
    });
    
  } catch (error) {
    console.error('❌ Bet API Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
