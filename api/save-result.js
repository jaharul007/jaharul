import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, message: "Method not allowed" });

    try {
        const client = await clientPromise;
        const db = client.db("wingo_game");

        const now = new Date();
        const dateStr = now.getFullYear().toString() + 
                       (now.getMonth() + 1).toString().padStart(2, '0') + 
                       now.getDate().toString().padStart(2, '0');

        const { period, mode: reqMode } = req.body;
        const modes = reqMode ? [parseInt(reqMode)] : [30, 60, 180, 300];

        for (let mode of modes) {
            const totalSeconds = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
            const finalPeriod = period || (dateStr + Math.floor(totalSeconds / mode).toString().padStart(4, '0'));

            // 1. Check if result already exists
            const exists = await db.collection('results').findOne({ period: finalPeriod, mode: mode });
            
            if (!exists) {
                // 2. Admin Force Check
                const adminForced = await db.collection('history').findOne({ 
                    period: finalPeriod, 
                    mode: mode 
                });

                let finalNum;
                if (adminForced && adminForced.number !== undefined) {
                    finalNum = parseInt(adminForced.number);
                } else {
                    finalNum = Math.floor(Math.random() * 10);
                }
                
                // 3. Save result
                await db.collection('results').insertOne({
                    period: finalPeriod,
                    number: finalNum,
                    mode: mode,
                    timestamp: new Date()
                });

                // 4. Run Settlement Logic (Winners ko paise dena)
                await settleBetsForPeriod(db, finalPeriod, mode, finalNum);

                // 5. Cleanup admin record
                if (adminForced) {
                    await db.collection('history').deleteOne({ _id: adminForced._id });
                }
            }
        }

        return res.status(200).json({ success: true, message: "Processed" });

    } catch (e) {
        console.error("❌ API Error:", e);
        return res.status(500).json({ success: false, error: e.message });
    }
}

// Settlement Helper Function
async function settleBetsForPeriod(db, period, mode, winNum) {
    const pendingBets = await db.collection('bets').find({
        period: period,
        mode: mode,
        status: 'pending'
    }).toArray();

    if (pendingBets.length === 0) return;

    const winSize = winNum >= 5 ? 'Big' : 'Small';
    let winColors = (winNum === 0) ? ['Red', 'Violet'] : 
                    (winNum === 5) ? ['Green', 'Violet'] : 
                    (winNum % 2 === 0) ? ['Red'] : ['Green'];

    for (let bet of pendingBets) {
        let isWin = false;
        let mult = 0;

        if (bet.betOn == winNum) { isWin = true; mult = 9; }
        else if (bet.betOn === winSize) { isWin = true; mult = 2; }
        else if (winColors.includes(bet.betOn)) {
            isWin = true;
            mult = (bet.betOn === 'Violet') ? 4.5 : (winNum === 0 || winNum === 5 ? 1.5 : 2);
        }

        if (isWin) {
            const winAmount = bet.amount * mult;
            await db.collection('users').updateOne({ phone: bet.phone }, { $inc: { balance: winAmount, totalWins: 1 } });
            await db.collection('bets').updateOne({ _id: bet._id }, { $set: { status: 'won', winAmount, result: winNum, processedAt: new Date() } });
        } else {
            await db.collection('bets').updateOne({ _id: bet._id }, { $set: { status: 'lost', winAmount: 0, result: winNum, processedAt: new Date() } });
            await db.collection('users').updateOne({ phone: bet.phone }, { $inc: { totalLosses: 1 } });
        }
    }
}
