import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  // 1. CORS Headers (ताकि फ्रंटएंड से कॉल करने पर कोई समस्या न आए)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS रिक्वेस्ट को हैंडल करना (Pre-flight request)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // सिर्फ GET मेथड को अनुमति देना
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { phone } = req.query;

    // चेक करें कि फोन नंबर भेजा गया है या नहीं
    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number is required' 
      });
    }

    // MongoDB से कनेक्ट करना
    const client = await clientPromise;
    const db = client.db('wingo_game'); // आपका डेटाबेस नाम

    // यूजर को खोजना
    const user = await db.collection('users').findOne({ phone: phone });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found in database' 
      });
    }

    // 2. डेटा भेजना (बिना LocalStorage की जरूरत के)
    // यहाँ आप और भी फील्ड्स जोड़ सकते हैं जो आपको हर पेज पर चाहिए
    return res.status(200).json({
      success: true,
      data: {
        uid: user._id,           // MongoDB की अपनी ID
        phone: user.phone,       // यूजर का फोन
        balance: user.balance || 0, // अगर बैलेंस न हो तो 0 दिखाएगा
        vip_level: user.vip || 1,  // VIP लेवल (अगर है तो)
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
