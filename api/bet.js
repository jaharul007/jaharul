import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
    const client = await clientPromise;
    const db = client.db('test');

    // --- CASE 1: BET LAGANA (POST) ---
    if (req.method === 'POST') {
        try {
            const { phone, period, mode, betOn, amount } = req.body;
            const betAmount = parseFloat(amount);

            // 1. Balance check aur deduct
            const updateResult = await db.collection('users').updateOne(
                { phoneNumber: phone, balance: { $gte: betAmount } },
                { $inc: { balance: -betAmount } }
            );

            if (updateResult.matchedCount === 0) return res.status(400).json({ success: false, message: 'Balance kam hai!' });

            // 2. Bet insert
            await db.collection('bets').insertOne({
                phone, period, mode: parseInt(mode), betOn: String(betOn),
                amount: betAmount, status: 'pending', timestamp: new Date()
            });

            const user = await db.collection('users').findOne({ phoneNumber: phone });
            return res.status(200).json({ success: true, newBalance: user.balance });
        } catch (e) { return res.status(500).json({ success: false }); }
    }

    // --- CASE 2: WIN/LOSS CHECK KARNA AUR PAISA DENA (GET) ---
    if (req.method === 'GET') {
        try {
            const { phone, period } = req.query;
            
            // 1. Check karo result kya aaya hai
            const result = await db.collection('results').findOne({ period });
            if (!result) return res.json({ status: 'pending' });

            // 2. User ki bet dhundo
            const bet = await db.collection('bets').findOne({ phone, period, status: 'pending' });
            if (!bet) {
                const checkedBet = await db.collection('bets').findOne({ phone, period });
                return res.json({ status: checkedBet ? checkedBet.status : 'no_bet', resultNumber: result.number });
            }

            // 3. Winning Logic
            let finalNum = result.number;
            let isWin = false;
            let mult = 0;
            const winSize = finalNum >= 5 ? 'Big' : 'Small';
            const winColors = (finalNum === 0) ? ['Red', 'Violet'] : (finalNum === 5) ? ['Green', 'Violet'] : (finalNum % 2 === 0) ? ['Red'] : ['Green'];

            if (bet.betOn == finalNum) { isWin = true; mult = 9; }
            else if (bet.betOn === winSize) { isWin = true; mult = 2; }
            else if (winColors.includes(bet.betOn)) {
                isWin = true;
                mult = (bet.betOn === 'Violet') ? 4.5 : (finalNum === 0 || finalNum === 5 ? 1.5 : 2);
            }

            // 4. Update Database
            if (isWin) {
                const winAmount = bet.amount * mult;
                await db.collection('users').updateOne({ phoneNumber: phone }, { $inc: { balance: winAmount } });
                await db.collection('bets').updateOne({ _id: bet._id }, { $set: { status: 'won', winAmount, result: finalNum } });
                return res.json({ status: 'won', winAmount, resultNumber: finalNum });
            } else {
                await db.collection('bets').updateOne({ _id: bet._id }, { $set: { status: 'lost', winAmount: 0, result: finalNum } });
                return res.json({ status: 'lost', resultNumber: finalNum });
            }
        } catch (e) { return res.status(500).json({ error: e.message }); }
    }
}
