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
    const { mode = 60, page = 1 } = req.query;
    const limit = 10;
    const skip = (parseInt(page) - 1) * limit;
    
    const client = await clientPromise;
    const db = client.db('wingo_game');
    
    // Results collection se data nikalna
    const history = await db.collection('results')
      .find({ mode: parseInt(mode) })
      .sort({ period: -1 }) // Latest result sabse upar
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Frontend compatibility ke liye format karna
    const formattedHistory = history.map(item => ({
      p: item.period,
      n: item.number,
      period: item.period,
      number: item.number,
      result: item.number
    }));
    
    return res.status(200).json({
      success: true,
      results: formattedHistory, // Frontend isi ka use kar raha hai
      history: formattedHistory,
      data: formattedHistory,
      page: parseInt(page),
      mode: parseInt(mode)
    });
    
  } catch (error) {
    console.error('❌ History API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error'
    });
  }
}
