import clientPromise from '../lib/mongodb.js'; // 'i' small rakhein

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false });

    try {
        const client = await clientPromise;
        const db = client.db("test"); 
        
        // Body se data nikalna
        const { period, mode: reqMode, number: adminNum } = req.body;
        const mode = parseInt(reqMode) || 60;

        // 1. Result fix karna (Admin input ya Random)
        let finalNum = (adminNum !== undefined && adminNum !== "") ? parseInt(adminNum) : Math.floor(Math.random() * 10);
        
        // --- HISTORY SAVING SECTION ---
        // 'results' collection mein data daalna
        const resultData = {
            period: period.toString(), // String mein convert karna safe rehta hai
            number: finalNum,
            mode: mode,
            timestamp: new Date()
        };
        
        await db.collection('results').insertOne(resultData);
        // ------------------------------

        // 2. Betting Calculation
        const pendingBets = await db.collection('bets').find({ 
            period: period.toString(), 
            mode: mode, 
            status: 'pending' 
        }).toArray();
        
        const winSize = finalNum >= 5 ? 'Big' : 'Small';
        let winColors = [];
        if (finalNum === 0) winColors = ['Red', 'Violet'];
        else if (finalNum === 5) winColors = ['Green', 'Violet'];
        else if (finalNum % 2 === 0) winColors = ['Red'];
        else winColors = ['Green'];

        // Loop for updating balance and bets
        for (let bet of pendingBets) {
            let isWin = false;
            let mult = 0;

            if (bet.betOn == finalNum) { isWin = true; mult = 9; }
            else if (bet.betOn === winSize) { isWin = true; mult = 2; }
            else if (winColors.includes(bet.betOn)) {
                isWin = true;
                mult = (bet.betOn === 'Violet') ? 4.5 : (finalNum === 0 || finalNum === 5 ? 1.5 : 2);
            }

            if (isWin) {
                const winAmount = parseFloat(bet.amount) * mult;
                
                // User collection mein balance update
                await db.collection('users').updateOne(
                    { phoneNumber: bet.phone }, 
                    { $inc: { balance: winAmount } }
                );
                
                // Bet status update
                await db.collection('bets').updateOne(
                    { _id: bet._id }, 
                    { $set: { status: 'won', winAmount: winAmount, result: finalNum } }
                );
            } else {
                await db.collection('bets').updateOne(
                    { _id: bet._id }, 
                    { $set: { status: 'lost', winAmount: 0, result: finalNum } }
                );
            }
        }

        return res.status(200).json({ 
            success: true, 
            message: "Result saved and bets settled", 
            number: finalNum 
        });

    } catch (e) {
        console.error("Save Result Error:", e);
        return res.status(500).json({ success: false, error: e.message });
    }
}
