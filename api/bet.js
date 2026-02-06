import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
    const client = await clientPromise;
    const db = client.db('test');
    const usersColl = db.collection('users');
    const betsColl = db.collection('bets');
    const resultsColl = db.collection('results');

    // 1. GET REQUEST: बैलेंस चेक, रिजल्ट चेक और एडमिन डेटा
    if (req.method === 'GET') {
        const { action, phone, period, mode } = req.query;

        try {
            // --- फीचर: यूजर का बैलेंस दिखाना ---
            if (action === 'getBalance') {
                const user = await usersColl.findOne({ phoneNumber: phone });
                if (!user) {
                    // अगर यूजर नहीं है, तो नया बनाओ (Initial Balance 1000)
                    await usersColl.insertOne({ phoneNumber: phone, balance: 1000 });
                    return res.status(200).json({ success: true, balance: 1000 });
                }
                return res.status(200).json({ success: true, balance: user.balance });
            }

            // --- फीचर: विन/लॉस चेक करना (Auto Pay) ---
            if (action === 'checkResult') {
                const result = await resultsColl.findOne({ period: period, mode: parseInt(mode) });
                if (!result) return res.json({ status: 'pending' });

                const bet = await betsColl.findOne({ phone, period, status: 'pending' });
                if (!bet) {
                    const alreadyChecked = await betsColl.findOne({ phone, period });
                    return res.json({ status: alreadyChecked ? alreadyChecked.status : 'no_bet', resultNumber: result.number });
                }

                // Winning Logic
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

                if (isWin) {
                    const winAmount = bet.amount * mult;
                    await usersColl.updateOne({ phoneNumber: phone }, { $inc: { balance: winAmount } });
                    await betsColl.updateOne({ _id: bet._id }, { $set: { status: 'won', winAmount, result: finalNum } });
                    return res.json({ status: 'won', winAmount, resultNumber: finalNum });
                } else {
                    await betsColl.updateOne({ _id: bet._id }, { $set: { status: 'lost', winAmount: 0, result: finalNum } });
                    return res.json({ status: 'lost', resultNumber: finalNum });
                }
            }

            // --- फीचर: एडमिन के लिए लाइव बेट्स देखना ---
            if (action === 'adminSummary') {
                const pendingBets = await betsColl.find({ period: period, mode: parseInt(mode) }).toArray();
                return res.json({ success: true, bets: pendingBets });
            }

        } catch (e) { return res.status(500).json({ error: e.message }); }
    }

    // 2. POST REQUEST: बैट लगाना और एडमिन द्वारा रिजल्ट फोर्स करना
    if (req.method === 'POST') {
        const { action, phone, period, mode, betOn, amount, forceNumber } = req.body;

        try {
            // --- फीचर: बैट लगाना और पैसा काटना ---
            if (action === 'placeBet') {
                const betAmount = parseFloat(amount);
                const updateResult = await usersColl.updateOne(
                    { phoneNumber: phone, balance: { $gte: betAmount } },
                    { $inc: { balance: -betAmount } }
                );

                if (updateResult.matchedCount === 0) return res.status(400).json({ success: false, message: 'Balance kam hai!' });

                await betsColl.insertOne({
                    phone, period, mode: parseInt(mode), betOn: String(betOn),
                    amount: betAmount, status: 'pending', timestamp: new Date()
                });

                const user = await usersColl.findOne({ phoneNumber: phone });
                return res.status(200).json({ success: true, newBalance: user.balance });
            }

            // --- फीचर: एडमिन कंट्रोल (रिजल्ट फोर्स करना) ---
            if (action === 'forceResult') {
                // यह रिजल्ट को results कलेक्शन में डाल देगा ताकि गेम वही नंबर दिखाए
                await resultsColl.updateOne(
                    { period: period, mode: parseInt(mode) },
                    { $set: { number: parseInt(forceNumber), timestamp: new Date() } },
                    { upsert: true }
                );
                return res.json({ success: true, message: 'Result forced successfully!' });
            }

        } catch (e) { return res.status(500).json({ error: e.message }); }
    }
}
