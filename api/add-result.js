import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  // CORS Headers
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

    // डेटा चेक करें
    if (!period || mode === undefined || number === undefined) {
      return res.status(400).json({ success: false, message: 'Missing data (period, mode or number)' });
    }

    const client = await clientPromise;
    const db = client.db('wingo_game');
    const historyCollection = db.collection('history');

    // ✅ सुधार: 'insertOne' की जगह 'updateOne' का उपयोग
    // यह चेक करेगा कि क्या उस 'period' और 'mode' का डेटा पहले से है
    // अगर है तो उसे अपडेट कर देगा, नहीं है तो नया बना देगा (upsert: true)
    const result = await historyCollection.updateOne(
      { 
        period: period.toString(), 
        mode: parseInt(mode) 
      },
      { 
        $set: { 
          number: parseInt(number),
          timestamp: new Date(),
          isForced: true, // इससे पता चलेगा कि यह एडमिन ने सेट किया है
          updatedAt: new Date()
        } 
      },
      { upsert: true } 
    );

    console.log(`✅ Result Saved: Period ${period} - Number ${number}`);

    res.status(200).json({ 
        success: true, 
        message: 'Result updated successfully',
        details: result 
    });

  } catch (error) {
    console.error('Add result API error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
}
