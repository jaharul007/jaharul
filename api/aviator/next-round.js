import clientPromise from '../../lib/mongodb.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const client = await clientPromise;
    const db = client.db('wingo_game');

    // 1. चेक करें कि क्या एडमिन ने कोई खास Crash Point सेट किया है
    const adminControl = await db.collection('settings').findOne({ type: 'aviator_control' });
    
    let crashPoint;
    
    if (adminControl && adminControl.nextCrashPoint) {
      // अगर एडमिन ने सेट किया है, तो वही इस्तेमाल करें
      crashPoint = adminControl.nextCrashPoint;
      // इस्तेमाल के बाद इसे हटा दें ताकि अगला राउंड फिर से रैंडम हो सके
      await db.collection('settings').updateOne(
        { type: 'aviator_control' },
        { $unset: { nextCrashPoint: "" } }
      );
    } else {
      // 2. अगर एडमिन ने कुछ सेट नहीं किया, तो रैंडम (Algorithmic) क्रैश पॉइंट बनाएँ
      // यह लॉजिक थोड़ा 'House Edge' रखता है ताकि गेम प्रॉफिटेबल रहे
      const rand = Math.random();
      if (rand < 0.03) {
        crashPoint = 1.00; // 3% चांस कि तुरंत फटेगा
      } else {
        crashPoint = parseFloat((0.95 / (1 - Math.random())).toFixed(2));
        if (crashPoint < 1.00) crashPoint = 1.01;
        if (crashPoint > 50) crashPoint = parseFloat((Math.random() * 5 + 1).toFixed(2)); // ज्यादा ऊपर जाने से रोकें
      }
    }

    // 3. नया राउंड आईडी जेनरेट करें
    const roundId = Math.floor(1000000 + Math.random() * 9000000);

    return res.status(200).json({
      success: true,
      roundId: roundId,
      crashPoint: crashPoint
    });

  } catch (error) {
    console.error('❌ Next Round API Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
