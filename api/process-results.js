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
    const { period, mode } = req.body;

    if (!period || !mode) {
      return res.status(400).json({ success: false, message: 'Missing data' });
    }

    const client = await clientPromise;
    const db = client.db('wingo_game');
    const historyCollection = db.collection('history');
    const betsCollection = db.collection('bets');
    const usersCollection = db.collection('users');

    // Get result
    const result = await historyCollection.findOne({
      period: period,
      mode: parseInt(mode)
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found yet' });
    }

    const winningNumber = result.number;

    // Get pending bets
    const pendingBets = await betsCollection.find({
      period: period,
      mode: parseInt(mode),
      status: 'pending'
    }).toArray();

    console.log(`Processing ${pendingBets.length} bets for period ${period}, number ${winningNumber}`);

    // Process each bet
    for (let bet of pendingBets) {
      let isWin = false;
      let winMultiplier = 0;

      // Check win conditions
      if (bet.betType === 'number') {
        if (parseInt(bet.betOn) === winningNumber) {
          isWin = true;
          winMultiplier = 9;
        }
      } else if (bet.betType === 'color') {
        if (bet.betOn === 'Green' && [1, 3, 7, 9].includes(winningNumber)) {
          isWin = true;
          winMultiplier = 2;
        } else if (bet.betOn === 'Red' && [2, 4, 6, 8].includes(winningNumber)) {
          isWin = true;
          winMultiplier = 2;
        } else if (bet.betOn === 'Violet' && [0, 5].includes(winningNumber)) {
          isWin = true;
          winMultiplier = 4.5;
        }
      } else if (bet.betType === 'size') {
        if (bet.betOn === 'Big' && winningNumber >= 5) {
          isWin = true;
          winMultiplier = 2;
        } else if (bet.betOn === 'Small' && winningNumber < 5) {
          isWin = true;
          winMultiplier = 2;
        }
      }

      // Update bet
      const updateData = {
        status: isWin ? 'won' : 'lost',
        resultNumber: winningNumber,
        processedAt: new Date()
      };

      if (isWin) {
        const winAmount = bet.amount * winMultiplier;
        updateData.winAmount = winAmount;

        // Credit user
        await usersCollection.updateOne(
          { phone: bet.phone },
          {
            $inc: { balance: winAmount },
            $set: { updatedAt: new Date() }
          }
        );

        console.log(`✅ Win: ${bet.phone} won ₹${winAmount}`);
      }

      await betsCollection.updateOne(
        { _id: bet._id },
        { $set: updateData }
      );
    }

    res.status(200).json({ success: true, message: 'Results processed' });

  } catch (error) {
    console.error('Process results API error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
```

---

## 1️⃣1️⃣ **public/wingo_game.html** (Same as before - pehle diya hua code)

*Previous wala complete HTML code use karein*

---

## 🚀 Deployment Steps

### **1. MongoDB Atlas Setup**

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Create database: `wingo_game`
4. Get connection string:
```
mongodb+srv://username:password@cluster.mongodb.net/wingo_game?retryWrites=true&w=majority