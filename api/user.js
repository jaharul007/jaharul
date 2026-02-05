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
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const client = await clientPromise;
    const db = client.db('test'); // नोट: आपके रजिस्टर कोड में मोंगूस डिफ़ॉल्ट 'test' या 'wingo_game' यूज़ करता है, इसे चेक कर लें

    // सुधार: यहाँ हमने 'phoneNumber' चेक किया है क्योंकि register.js 'phoneNumber' नाम से सेव कर रहा है
    const user = await db.collection('users').findOne({ 
      $or: [{ phoneNumber: phone }, { phone: phone }] 
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // डेटा वापस भेजना
    return res.status(200).json({
      success: true,
      data: {
        uid: user._id,
        phone: user.phoneNumber || user.phone, 
        balance: user.balance || 0, // यहाँ ₹100 अब दिखाई देगा
        username: user.username || 'Member'
      }
    });

  } catch (error) {
    console.error("Database Error:", error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
