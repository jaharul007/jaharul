import clientPromise from '../../lib/mongodb.js';

export default async function handler(req, res) {
  // CORS Headers (ताकि फ्रंटएंड से रिक्वेस्ट आ सके)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // सिर्फ POST रिक्वेस्ट की अनुमति दें
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { crashPoint } = req.body;

    if (!crashPoint || crashPoint < 1.00) {
      return res.status(400).json({ success: false, message: 'Invalid crash point' });
    }

    const client = await clientPromise;
    const db = client.db('wingo_game');

    // 'settings' कलेक्शन में जाकर 'nextCrashPoint' को अपडेट करें
    // यही वैल्यू 'next-round.js' उठाएगा
    await db.collection('settings').updateOne(
      { type: 'aviator_control' },
      { $set: { nextCrashPoint: parseFloat(crashPoint) } },
      { upsert: true } // अगर डॉक्यूमेंट नहीं है तो बना दे
    );

    return res.status(200).json({
      success: true,
      message: `Next crash point set to ${crashPoint}x`
    });

  } catch (error) {
    console.error('❌ Admin API Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
