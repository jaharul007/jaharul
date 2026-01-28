import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  
  try {
    const { phone, period, mode, betOn, amount, betType, multiplier } = req.body;
    
    // Validation
    if (!phone || !period || !mode || !betOn || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    const client = await clientPromise;
    const db = client.db('wingo_game');
    
    // Get user
    const user = await db.collection('users').findOne({ phone });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found. Please refresh page.' 
      });
    }
    
    const betAmount = parseFloat(amount);
    
    // Check balance
    if (user.balance < betAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient balance! Your balance: ₹${user.balance.toFixed(2)}` 
      });
    }
    
    // Create bet document
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
      timestamp: new Date(),
      processedAt: null
    };
    
    // Insert bet
    await db.collection('bets').insertOne(betData);
    
    // Deduct balance
    const newBalance = user.balance - betAmount;
    
    await db.collection('users').updateOne(
      { phone },
      { 
        $set: { 
          balance: newBalance, 
          updatedAt: new Date() 
        },
        $inc: { totalBets: 1 }
      }
    );
    
    console.log(`✅ Bet placed: ${phone} - ₹${betAmount} on ${betOn}`);
    
    return res.status(200).json({
      success: true,
      message: 'Bet placed successfully',
      newBalance: newBalance,
      betId: betData._id
    });
    
  } catch (error) {
    console.error('❌ Bet API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.', 
      error: error.message 
    });
  }
}