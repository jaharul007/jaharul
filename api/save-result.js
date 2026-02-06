import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false });

    try {
        const client = await clientPromise;
        const db = client.db("test"); // आपके DB का नाम 'test'
        const { period, mode: reqMode, number: adminNum } = req.body;
        const mode = parseInt(reqMode) || 60;

        let finalNum = (adminNum !== undefined) ? parseInt(adminNum) : Math.floor(Math.random() * 10);
        
        await db.collection('results').insertOne({
            period, number: finalNum, mode, timestamp: new Date()
        });

        const pendingBets = await db.collection('bets').find({ period, mode, status: 'pending' }).toArray();
        
        const winSize = finalNum >= 5 ? 'Big' : 'Small';
        let winColors = [];
        if (finalNum === 0) winColors = ['Red', 'Violet'];
        else if (finalNum === 5) winColors = ['Green', 'Violet'];
        else if (finalNum % 2 === 0) winColors = ['Red'];
        else winColors = ['Green'];

        for (let bet of pendingBets) {
            let isWin = false;
            let mult = 0;

            if (parseInt(bet.betOn) === finalNum) { isWin = true; mult = 9; }
            else if (bet.betOn === winSize) { isWin = true; mult = 2; }
            else if (winColors.includes(bet.betOn)) {
                isWin = true;
                mult = (bet.betOn === 'Violet') ? 4.5 : (finalNum === 0 || finalNum === 5 ? 1.5 : 2);
            }

            if (isWin) {
                const winAmount = bet.amount * mult;
                // यहाँ 'phoneNumber' का उपयोग किया है ताकि बैलेंस बढ़े
                await db.collection('users').updateOne(
                    { phoneNumber: bet.phone }, 
                    { $inc: { balance: winAmount } }
                );
                await db.collection('bets').updateOne({ _id: bet._id }, { $set: { status: 'won', winAmount, result: finalNum } });
            } else {
                await db.collection('bets').updateOne({ _id: bet._id }, { $set: { status: 'lost', winAmount: 0, result: finalNum } });
            }
        }
        return res.status(200).json({ success: true, number: finalNum });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
