import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { phone, mode } = req.query;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone required' });
    }

    const client = await clientPromise;
    const db = client.db('wingo_game');
    const betsCollection = db.collection('bets');

    // Query build karein
    const query = { phone: phone };
    if (mode) {
      query.mode = parseInt(mode);
    }

    // IMPORTANT: 'timestamp' ya 'period' par sort karein kyunki 'createdAt' shayad missing ho
    const bets = await betsCollection
      .find(query)
      .sort({ period: -1, timestamp: -1 }) 
      .limit(50) 
      .toArray();

    // Data return karein
    res.status(200).json({ 
      success: true, 
      bets: bets 
    });

  } catch (error) {
    console.error('My history API error:', error);
    res.status(500).json({ success: false, bets: [], message: 'Server error' });
  }
}
