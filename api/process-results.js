import clientPromise from '../lib/mongodb.js';

// Calculate winnings based on bet type
function calculateWinnings(betOn, betType, amount, result) {
  let won = false;
  let multiplier = 0;
  
  switch(betType) {
    case 'number':
      won = parseInt(betOn) === result;
      multiplier = 9;
      break;
      
    case 'color':
      if (betOn === 'Green') {
        won = [1, 3, 5, 7, 9].includes(result);
        multiplier = result === 5 ? 4.5 : 2;
      } else if (betOn === 'Red') {
        won = [0, 2, 4, 6, 8].includes(result);
        multiplier = result === 0 ? 4.5 : 2;
      } else if (betOn === 'Violet') {
        won = [0, 5].includes(result);
        multiplier = 4.5;
      }
      break;
      
    case 'size':
      if (betOn === 'Big') {
        won = result >= 5;
      } else if (betOn === 'Small') {
        won = result < 5;
      }
      multiplier = 2;
      break;
      
    case 'random':
      won = Math.random() > 0.5;
      multiplier = 2; // Random आमतौर पर 2X होता है
      break;
  }
  
  return {
    won,
    winAmount: won ? amount * multiplier : 0
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });
  
  try {
    const { period, mode } = req.body;
    if (!period || !mode) return res.status(400).json({ success: false, message: 'Missing period or mode' });
    
    const client = await clientPromise;
    const db = client.db('wingo_game');
    
    // 1. सबसे पहले चेक करें कि क्या एडमिन ने कोई रिजल्ट फोर्स किया है?
    // हम 'history' कलेक्शन चेक कर रहे हैं जहाँ add-result.js डेटा भेजता है
    const adminForced = await db.collection('history').findOne({ 
        period: period, 
        mode: parseInt(mode) 
    });

    // 2. रिजल्ट ढूँढें या बनाएँ
    let resultRecord = await db.collection('results').findOne({ period, mode: parseInt(mode) });
    
    if (!resultRecord) {
      // अगर एडमिन का नंबर है तो वही लें, वरना रैंडम
      const finalNumber = adminForced ? adminForced.number : Math.floor(Math.random() * 10);
      
      resultRecord = {
        period,
        mode: parseInt(mode),
        number: finalNumber,
        timestamp: new Date()
      };
      
      await db.collection('results').insertOne(resultRecord);
      console.log(`🎯 Final Result Set: Period ${period} = ${finalNumber} ${adminForced ? '(Forced)' : '(Random)'}`);
    }
    
    // 3. पेंडिंग बेट्स को प्रोसेस करें
    const pendingBets = await db.collection('bets').find({ period, mode: parseInt(mode), status: 'pending' }).toArray();
    
    for (const bet of pendingBets) {
      const { won, winAmount } = calculateWinnings(bet.betOn, bet.betType, bet.amount, resultRecord.number);
      const status = won ? 'won' : 'lost';
      
      await db.collection('bets').updateOne(
        { _id: bet._id },
        { $set: { status, winAmount, result: resultRecord.number, processedAt: new Date() } }
      );
      
      if (won) {
        await db.collection('users').updateOne(
          { phone: bet.phone },
          { $inc: { balance: winAmount, totalWins: 1 }, $set: { updatedAt: new Date() } }
        );
      } else {
        await db.collection('users').updateOne(
          { phone: bet.phone },
          { $inc: { totalLosses: 1 }, $set: { updatedAt: new Date() } }
        );
      }
    }
    
    return res.status(200).json({
      success: true,
      result: resultRecord.number,
      processedBets: pendingBets.length
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
