import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { period, mode, number } = req.body; // Yeh data save-result.js se aayega
    const client = await clientPromise;
    const db = client.db('wingo_game');

    // 1. Is Period ki sari pending bets nikalo
    const pendingBets = await db.collection('bets').find({
      period: period,
      mode: parseInt(mode),
      status: 'pending'
    }).toArray();

    if (pendingBets.length === 0) {
      return res.status(200).json({ success: true, message: 'No bets to settle' });
    }

    const winNum = parseInt(number);
    const winSize = winNum >= 5 ? 'Big' : 'Small';
    
    // Color Logic
    let winColors = [];
    if (winNum === 0) winColors = ['Red', 'Violet'];
    else if (winNum === 5) winColors = ['Green', 'Violet'];
    else if (winNum % 2 === 0) winColors = ['Red'];
    else winColors = ['Green'];

    // 2. Har bet ko process karo
    for (let bet of pendingBets) {
      let isWin = false;
      let multiplier = 0;

      // Check Winner
      if (bet.betOn == winNum) { isWin = true; multiplier = 9; } // Number win
      else if (bet.betOn === winSize) { isWin = true; multiplier = 2; } // Big/Small win
      else if (winColors.includes(bet.betOn)) {
        isWin = true;
        // Special case for 0 and 5 (Violet mixed)
        multiplier = (bet.betOn === 'Violet') ? 4.5 : (winNum === 0 || winNum === 5 ? 1.5 : 2);
      }

      if (isWin) {
        const winAmount = bet.amount * multiplier;
        // Winner ka balance badhao
        await db.collection('users').updateOne(
          { phone: bet.phone },
          { 
            $inc: { balance: winAmount, totalWins: 1 },
            $set: { updatedAt: new Date() }
          }
        );
        // Bet status update
        await db.collection('bets').updateOne(
          { _id: bet._id },
          { $set: { status: 'won', winAmount: winAmount, result: winNum, processedAt: new Date() } }
        );
      } else {
        // Loser ka status update
        await db.collection('bets').updateOne(
          { _id: bet._id },
          { $set: { status: 'lost', winAmount: 0, result: winNum, processedAt: new Date() } }
        );
        await db.collection('users').updateOne(
          { phone: bet.phone },
          { $inc: { totalLosses: 1 } }
        );
      }
    }

    return res.status(200).json({ success: true, settled: pendingBets.length });

  } catch (error) {
    console.error('❌ Settlement Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
