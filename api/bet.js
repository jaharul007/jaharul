import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const betData = req.body;
    const { phone, amount, period, mode, betOn } = betData;

    if (!phone || !amount || !period || !mode || !betOn) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const client = await clientPromise;
    const db = client.db('wingo_game');
    const usersCollection = db.collection('users');
    const betsCollection = db.collection('bets');

    // Get user
    const user = await usersCollection.findOne({ phone: phone });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check balance
    if (user.balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Deduct balance
    const newBalance = user.balance - amount;
    await usersCollection.updateOne(
      { phone: phone },
      {
        $set: {
          balance: newBalance,
          updatedAt: new Date()
        }
      }
    );

    // Determine bet type
    let betType = 'number';
    if (['Green', 'Red', 'Violet'].includes(betOn)) {
      betType = 'color';
    } else if (['Big', 'Small'].includes(betOn)) {
      betType = 'size';
    } else if (betOn === 'Random') {
      betType = 'random';
    }

    // Save bet
    const bet = {
      phone: phone,
      period: period,
      mode: parseInt(mode),
      betOn: betOn,
      betType: betType,
      amount: parseFloat(amount),
      multiplier: betData.multiplier || 1,
      status: 'pending',
      timestamp: new Date(betData.timestamp || Date.now()),
      createdAt: new Date()
    };

    await betsCollection.insertOne(bet);

    console.log(`✅ Bet placed: ${phone} - ${betOn} - ₹${amount}`);

    res.status(200).json({
      success: true,
      message: 'Bet placed successfully',
      newBalance: newBalance,
      betId: bet._id
    });

  } catch (error) {
    console.error('Bet API error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}