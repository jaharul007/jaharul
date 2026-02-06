import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });
  
  try {
    // Frontend से आने वाला डेटा
    const { phone, phoneNumber, period, mode, betOn, amount, betType, multiplier } = req.body;
    
    // index.html 'phoneNumber' भेजता है, WinGo 'phone' भेज सकता है। 
    // हम पक्का कर रहे हैं कि हमारे पास सही नंबर हो।
    const userIdentifier = phoneNumber || phone;
    const betAmount = parseFloat(amount);

    // 1. Validation
    if (!userIdentifier || !period || isNaN(betAmount) || betAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid bet details' });
    }
    
    const client = await clientPromise;
    const db = client.db('wingo_game');
    
    // 2. Atomic Update - बैलेंस चेक और कटौती
    // यहाँ हमने 'phoneNumber' फील्ड का उपयोग किया है जैसा तुमने DB में देखा
    const updateResult = await db.collection('users').updateOne(
      { phoneNumber: userIdentifier, balance: { $gte: betAmount } }, 
      { 
        $inc: { balance: -betAmount, totalBets: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    // अगर अपडेट नहीं हुआ, मतलब या तो यूजर नहीं मिला या बैलेंस कम है
    if (updateResult.matchedCount === 0) {
      const userCheck = await db.collection('users').findOne({ phoneNumber: userIdentifier });
      
      if (!userCheck) {
        return res.status(404).json({ success: false, message: 'User not found in Database' });
      }
      return res.status(400).json({ success: false, message: 'Insufficient balance!' });
    }
    
    // 3. बेट का डेटा 'bets' कलेक्शन में सेव करना
    const betData = {
      phone: userIdentifier,
      period,
      mode: parseInt(mode),
      betOn: String(betOn),
      betType: betType || 'number',
      amount: betAmount,
      multiplier: multiplier || 1,
      status: 'pending',
      result: null,
      winAmount: 0,
      timestamp: new Date()
    };
    
    await db.collection('bets').insertOne(betData);
    
    // नया बैलेंस वापस भेजना ताकि स्क्रीन पर तुरंत अपडेट हो सके
    const updatedUser = await db.collection('users').findOne({ phoneNumber: userIdentifier });
    
    console.log(`✅ Bet placed: ${userIdentifier} - ₹${betAmount} on ${betOn}`);
    
    return res.status(200).json({
      success: true,
      message: 'Bet placed successfully',
      newBalance: updatedUser.balance,
      betId: betData._id
    });
    
  } catch (error) {
    console.error('❌ Bet API Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
