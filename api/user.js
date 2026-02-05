import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number is required' 
      });
    }

    const client = await clientPromise;
    const db = client.db('test'); // अगर आपने DB नाम बदला है तो यहाँ 'wingo_game' करें

    // अब हम सिर्फ 'phone' फील्ड में ढूंढ रहे हैं
    const user = await db.collection('users').findOne({ phone: phone });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found in database' 
      });
    }

    // बैलेंस और अन्य डेटा भेजना
    return res.status(200).json({
      success: true,
      data: {
        uid: user._id,
        phone: user.phone,
        balance: user.balance || 0, // यहाँ ₹100 अब पक्का दिखेगा
        username: user.username || 'Member'
      }
    });

  } catch (error) {
    console.error("Database Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error.message 
    });
  }
}
