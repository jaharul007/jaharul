import clientPromise from '../lib/mongodb.js';

// Generate random number 0-9
function generateRandomNumber() {
  return Math.floor(Math.random() * 10);
}

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
      multiplier = 9;
      break;
  }
  
  return {
    won,
    winAmount: won ? amount * multiplier : 0
  };
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  
  try {
    const { period, mode } = req.body;
    
    if (!period || !mode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing period or mode' 
      });
    }
    
    const client = await clientPromise;
    const db = client.db('wingo_game');
    
    // Check if result already exists
    let result = await db.collection('results').findOne({ 
      period, 
      mode: parseInt(mode) 
    });
    
    // Generate new result if not exists
    if (!result) {
      const randomNumber = generateRandomNumber();
      result = {
        period,
        mode: parseInt(mode),
        number: randomNumber,
        timestamp: new Date()
      };
      
      await db.collection('results').insertOne(result);
      console.log(`🎲 New result generated: Period ${period} = ${randomNumber}`);
    }
    
    // Get all pending bets for this period
    const pendingBets = await db.collection('bets')
      .find({ 
        period, 
        mode: parseInt(mode), 
        status: 'pending' 
      })
      .toArray();
    
    console.log(`⏳ Processing ${pendingBets.length} pending bets for period ${period}`);
    
    // Process each bet
    for (const bet of pendingBets) {
      const { won, winAmount } = calculateWinnings(
        bet.betOn,
        bet.betType,
        bet.amount,
        result.number
      );
      
      const status = won ? 'won' : 'lost';
      
      // Update bet status
      await db.collection('bets').updateOne(
        { _id: bet._id },
        { 
          $set: { 
            status, 
            winAmount,
            result: result.number,
            processedAt: new Date()
          }
        }
      );
      
      // Update user balance and stats
      if (won) {
        await db.collection('users').updateOne(
          { phone: bet.phone },
          { 
            $inc: { 
              balance: winAmount,
              totalWins: 1
            },
            $set: { updatedAt: new Date() }
          }
        );
        console.log(`✅ ${bet.phone} won ₹${winAmount.toFixed(2)}`);
      } else {
        await db.collection('users').updateOne(
          { phone: bet.phone },
          { 
            $inc: { totalLosses: 1 },
            $set: { updatedAt: new Date() }
          }
        );
        console.log(`❌ ${bet.phone} lost ₹${bet.amount.toFixed(2)}`);
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Results processed successfully',
      result: result.number,
      processedBets: pendingBets.length,
      period: period
    });
    
  } catch (error) {
    console.error('❌ Process Results Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
}