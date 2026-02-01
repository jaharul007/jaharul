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

    // ✅ सुधार: 'insertOne' की जगह 'updateOne' का उपयोग करें
    // इससे अगर पीरियड पहले से मौजूद है, तो आपका चुना हुआ नंबर वहां अपडेट हो जाएगा
    const result = await historyCollection.updateOne(
      { period: period, mode: parseInt(mode) },
      { 
        $set: { 
          number: parseInt(number),
          timestamp: new Date(),
          isForced: true // यह पहचानने के लिए कि एडमिन ने इसे बदला है
        } 
      },
      { upsert: true } // अगर नहीं है, तो नया बना दे
    );

    console.log(`✅ Result Updated/Added: Period ${period} - Number ${number}`);
    res.status(200).json({ success: true, message: 'Result saved successfully' });

  } catch (error) {
    console.error('Add result API error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
