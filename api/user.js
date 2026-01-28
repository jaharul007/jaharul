import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone required' });
    }

    const client = await clientPromise;
    const db = client.db('wingo_game');
    const usersCollection = db.collection('users');

    let user = await usersCollection.findOne({ phone: phone });

    if (!user) {
      // Create new user with starting balance
      const newUser = {
        phone: phone,
        balance: 1000.00,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await usersCollection.insertOne(newUser);
      return res.status(200).json({ success: true, balance: 1000.00 });
    }

    res.status(200).json({ success: true, balance: user.balance || 0 });

  } catch (error) {
    console.error('User API error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}