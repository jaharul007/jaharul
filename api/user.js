import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone required' });
    }

    const client = await clientPromise;
    const db = client.db('wingo_game');
    const user = await db.collection('users').findOne({ phone });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      balance: user.balance || 0,
      phone: user.phone
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
}
