import { connectToDatabase } from "../../lib/mongodb"; // अपना DB कनेक्शन इम्पोर्ट करें

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

    const { phone, period } = req.query;

    try {
        const { db } = await connectToDatabase();

        // 1. सबसे पहले चेक करें कि क्या इस पीरियड का रिजल्ट आ गया है
        const resultData = await db.collection("results").findOne({ period: period });

        if (!resultData) {
            return res.status(200).json({ status: 'pending', message: 'Result not declared yet' });
        }

        const winningNumber = parseInt(resultData.number);

        // 2. यूजर की बेट ढूंढें जो अभी भी 'pending' है
        const bet = await db.collection("bets").findOne({ phone, period, status: 'pending' });

        if (!bet) {
            // हो सकता है बेट पहले ही प्रोसेस हो चुकी हो
            const processedBet = await db.collection("bets").findOne({ phone, period });
            return res.status(200).json(processedBet);
        }

        // 3. जीतने का लॉजिक चेक करें
        let isWin = false;
        let winMultiplier = 0;

        // Number Bet Check (9X)
        if (!isNaN(bet.betOn) && parseInt(bet.betOn) === winningNumber) {
            isWin = true;
            winMultiplier = 9;
        }
        // Size Bet Check (2X)
        else if (bet.betOn === 'Big' && winningNumber >= 5) { isWin = true; winMultiplier = 2; }
        else if (bet.betOn === 'Small' && winningNumber <= 4) { isWin = true; winMultiplier = 2; }
        
        // Color Bet Check (2X or 1.5X)
        else if (bet.betOn === 'Green' && [1, 3, 7, 9].includes(winningNumber)) { isWin = true; winMultiplier = 2; }
        else if (bet.betOn === 'Red' && [2, 4, 6, 8].includes(winningNumber)) { isWin = true; winMultiplier = 2; }
        else if (bet.betOn === 'Violet' && [0, 5].includes(winningNumber)) { isWin = true; winMultiplier = 4.5; }
        // Special Case: Half win on 0 or 5 for colors
        else if ((bet.betOn === 'Green' && winningNumber === 5) || (bet.betOn === 'Red' && winningNumber === 0)) {
            isWin = true;
            winMultiplier = 1.5;
        }

        let winAmount = isWin ? bet.amount * winMultiplier : 0;
        let finalStatus = isWin ? 'won' : 'lost';

        // 4. Database Update (Atomic Transaction)
        // बेट स्टेटस अपडेट करें
        await db.collection("bets").updateOne(
            { _id: bet._id },
            { $set: { status: finalStatus, winAmount: winAmount, resultNumber: winningNumber } }
        );

        // अगर जीता है तो यूजर के वॉलेट में पैसा जोड़ें
        if (isWin) {
            await db.collection("users").updateOne(
                { phone: phone },
                { $inc: { balance: winAmount } }
            );
        }

        return res.status(200).json({
            status: finalStatus,
            winAmount: winAmount,
            resultNumber: winningNumber
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}
