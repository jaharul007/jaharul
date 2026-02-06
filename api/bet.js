import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });
  
  try {
    const { phone, phoneNumber, period, mode, betOn, amount, betType, multiplier } = req.body;
    
    // URL query से भी नंबर लेने की कोशिश करें अगर बॉडी में न हो
    const queryPhone = req.query.phone;
    const userIdentifier = phoneNumber || phone || queryPhone;
    
    const betAmount = parseFloat(amount);

    if (!userIdentifier || !period || isNaN(betAmount) || betAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid bet details or phone missing' });
    }
    
    const client = await clientPromise;
    // यहाँ बदलाव किया: 'test' डेटाबेस का नाम रखा
    const db = client.db('test'); 
    
    // 2. Atomic Update - बैलेंस चेक और कटौती
    // 'phoneNumber' फील्ड का उपयोग (जैसा तुम्हारे DB में है)
    const updateResult = await db.collection('users').updateOne(
      { phoneNumber: userIdentifier, balance: { $gte: betAmount } }, 
      { 
        $inc: { balance: -betAmount },
        $set: { updatedAt: new Date() }
      }
    );

    if (updateResult.matchedCount === 0) {
      const userCheck = await db.collection('users').findOne({ phoneNumber: userIdentifier });
      if (!userCheck) {
        return res.status(404).json({ success: false, message: `User ${userIdentifier} not found in test database` });
      }
      return res.status(400).json({ success: false, message: 'Insufficient balance!' });
    }
    
    // 3. बेट डेटा सेव करना
    const betData = {
      phone: userIdentifier,
      period,
      mode: parseInt(mode),
      betOn: String(betOn),
      betType: betType || 'number',
      amount: betAmount,
      multiplier: multiplier || 1,
      status: 'pending',
      timestamp: new Date()
    };
    
    await db.collection('bets').insertOne(betData);
    
    const updatedUser = await db.collection('users').findOne({ phoneNumber: userIdentifier });
    
    return res.status(200).json({
      success: true,
      message: 'Bet placed successfully',
      newBalance: updatedUser.balance
    });
    
  } catch (error) {
    console.error('❌ Bet API Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
