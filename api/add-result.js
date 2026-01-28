import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { period, mode, number } = req.body;

    if (!period || mode === undefined || number === undefined) {
      return res.status(400).json({ success: false, message: 'Missing data' });
    }

    const client = await clientPromise;
    const db = client.db('wingo_game');
    const historyCollection = db.collection('history');

    // Check if result already exists
    const existing = await historyCollection.findOne({
      period: period,
      mode: parseInt(mode)
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Result already exists' });
    }

    // Add result
    const result = {
      period: period,
      mode: parseInt(mode),
      number: parseInt(number),
      timestamp: new Date(),
      createdAt: new Date()
    };

    await historyCollection.insertOne(result);

    console.log(`✅ Result added: Period ${period} - Number ${number}`);

    res.status(200).json({ success: true, message: 'Result added' });

  } catch (error) {
    console.error('Add result API error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}