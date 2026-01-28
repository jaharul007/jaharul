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

    const query = { phone: phone };
    if (mode) {
      query.mode = parseInt(mode);
    }

    const bets = await betsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    res.status(200).json({ success: true, bets: bets });

  } catch (error) {
    console.error('My history API error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}