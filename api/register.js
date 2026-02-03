import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { phone, password, inviteCode } = req.body;
    const client = await clientPromise;
    const db = client.db('wingo_game');

    // चेक करें कि यूजर पहले से तो नहीं है
    const existingUser = await db.collection('users').findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already registered!' });
    }

    // बोनस लॉजिक
    let bonus = (inviteCode === "1234") ? 100 : 0;

    const newUser = {
      phone,
      password, // सुरक्षा के लिए इसे हैश करना बेहतर है
      balance: bonus,
      totalBets: 0,
      totalWins: 0,
      totalLosses: 0,
      createdAt: new Date()
    };

    await db.collection('users').insertOne(newUser);

    return res.status(200).json({ success: true, message: 'Registered!', bonus });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
