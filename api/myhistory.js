import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  
  try {
    const { phone, mode = 60 } = req.query;
    
    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number required' 
      });
    }
    
    const client = await clientPromise;
    const db = client.db('wingo_game');
    
    // Yahan hum ensure kar rahe hain ki mode hamesha Number rahe
    const bets = await db.collection('bets')
      .find({ 
        phone: phone, 
        mode: parseInt(mode) 
      })
      .sort({ timestamp: -1 }) // Taki naye bets sabse upar dikhen
      .limit(50)
      .toArray();
    
    console.log(`📜 My History: ${bets.length} bets for ${phone}`);
    
    return res.status(200).json({
      success: true,
      bets: bets,
      count: bets.length
    });
    
  } catch (error) {
    console.error('❌ My History API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
}
