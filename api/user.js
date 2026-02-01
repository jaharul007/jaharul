// 'Import' ko 'import' (small letter) kiya gaya hai
import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  // CORS headers - Vercel par external request ke liye zaroori hai
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
    const { phone } = req.query;
    
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number required' });
    }
    
    const client = await clientPromise;
    // Database name check kar lijiye jo aapne Atlas mein banaya hai
    const db = client.db('wingo_game');
    
    // User dhund rahe hain
    let user = await db.collection('users').findOne({ phone });
    
    // Agar user nahi mila toh naya banayenge (Starting balance 100 ke saath)
    if (!user) {
      const newUser = {
        phone: phone,
        balance: 100, // Aap ise badal sakte hain
        totalDeposit: 0,
        totalWithdraw: 0,
        totalBets: 0,
        totalWins: 0,
        totalLosses: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('users').insertOne(newUser);
      user = newUser; // Taki niche return mein data mil sake
      console.log('✅ New user created:', phone);
    }
    
    // Frontend ko data bhej rahe hain
    return res.status(200).json({
      success: true,
      phone: user.phone,
      balance: user.balance || 0,
      totalBets: user.totalBets || 0,
      totalWins: user.totalWins || 0,
      totalLosses: user.totalLosses || 0
    });
    
  } catch (error) {
    console.error('❌ User API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
}
