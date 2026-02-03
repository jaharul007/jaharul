import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });
  
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });
    
    const client = await clientPromise;
    const db = client.db('wingo_game');
    
    // डेटाबेस से यूजर का ताज़ा डेटा प्राप्त करें
    const user = await db.collection('users').findOne({ phone });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
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
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
