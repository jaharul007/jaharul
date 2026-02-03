import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  
  try {
    const { phone, inviteCode } = req.query; // inviteCode भी रिसीव कर रहे हैं
    
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number required' });
    }
    
    const client = await clientPromise;
    const db = client.db('wingo_game');
    
    let user = await db.collection('users').findOne({ phone });
    
    // Naya user banane ka logic (Jab पहली बार रजिस्टर हो)
    if (!user) {
      // बोनस चेक करें: अगर कोड 1234 है तो 100, वरना 0
      let bonusAmount = (inviteCode === "1234") ? 100 : 0;

      user = {
        phone,
        balance: bonusAmount,
        totalBets: 0,
        totalWins: 0,
        totalLosses: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        inviteUsed: inviteCode || "none"
      };
      
      await db.collection('users').insertOne(user);
    }
    
    // Response में डेटा भेजें
    return res.status(200).json({
      success: true,
      phone: user.phone,
      balance: user.balance ?? 0,
      totalBets: user.totalBets ?? 0,
      totalWins: user.totalWins ?? 0,
      totalLosses: user.totalLosses ?? 0
    });
    
  } catch (error) {
    console.error('❌ User API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error'
    });
  }
}
