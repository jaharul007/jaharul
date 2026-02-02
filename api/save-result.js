import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
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
            
            // --- LENGTH BADHANE WALA LOGIC YAHAN HAI ---
            // dateStr(8) + mode(3) + sequence(4) = 15 Digits
            const modeStr = mode.toString().padStart(3, '0');
            const sequence = Math.floor(totalSeconds / mode).toString().padStart(4, '0');
            const currentCalculatedPeriod = dateStr + modeStr + sequence; 
            
            const finalPeriod = period || currentCalculatedPeriod;

            const exists = await db.collection('results').findOne({ period: finalPeriod, mode: mode });
            
            if (!exists) {
                let adminForced = await db.collection('history').findOne({ period: finalPeriod, mode: mode });
                if (!adminForced) { adminForced = await db.collection('history').findOne({ mode: mode }); }

                let finalNum;
                if (adminForced && adminForced.number !== undefined) {
                    finalNum = parseInt(adminForced.number);
                } else {
                    finalNum = Math.floor(Math.random() * 10);
                }
                
                await db.collection('results').insertOne({
                    period: finalPeriod,
                    number: finalNum,
                    mode: mode,
                    timestamp: new Date()
                });

                await settleBetsForPeriod(db, finalPeriod, mode, finalNum);

                if (adminForced) {
                    await db.collection('history').deleteOne({ _id: adminForced._id });
                }
            }
        }
        return res.status(200).json({ success: true, message: "Processed Successfully" });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
}

// SettleBets function waisa hi rahega...
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
            mult = (bet.betOn === 'Violet') ? 4.5 : ((winNum === 0 || winNum === 5) ? 1.5 : 2);
        }

        if (isWin) {
            const winAmount = parseFloat(bet.amount) * mult;
            await db.collection('users').updateOne({ phone: bet.phone }, { $inc: { balance: winAmount } });
            await db.collection('bets').updateOne({ _id: bet._id }, { $set: { status: 'won', winAmount, result: winNum } });
        } else {
            await db.collection('bets').updateOne({ _id: bet._id }, { $set: { status: 'lost', winAmount: 0, result: winNum } });
        }
    }
}
