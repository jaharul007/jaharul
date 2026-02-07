import mongoose from 'mongoose';
import Result from '../models/Result.js';
import User from '../models/User.js'; 
import Bet from '../models/Bet.js';

export default async function handler(req, res) {
    if (mongoose.connections[0].readyState !== 1) await mongoose.connect(process.env.MONGO_URI);

    if (req.method === 'POST') {
        try {
            const { period, mode, number, isAdmin } = req.body;

            // 1. रिजल्ट पहले से है या नहीं
            const existing = await Result.findOne({ period, mode: parseInt(mode) });
            if (existing) return res.json({ success: true, message: "Already Settled" });

            // 2. एडमिन नंबर या रैंडम
            let finalNum = (isAdmin && number !== undefined) ? parseInt(number) : Math.floor(Math.random() * 10);
            
            const color = (finalNum === 0) ? ['red', 'violet'] : (finalNum === 5) ? ['green', 'violet'] : (finalNum % 2 === 0) ? ['red'] : ['green'];
            const size = (finalNum >= 5) ? 'Big' : 'Small';

            // 3. रिजल्ट सेव करें
            const savedResult = await Result.create({
                period, mode: parseInt(mode), number: finalNum, color, size, isForced: isAdmin || false
            });

            // 4. पैसा बाँटना (Settlement)
            const pendingBets = await Bet.find({ period, mode: parseInt(mode), status: 'pending' });

            for (let bet of pendingBets) {
                let isWin = false;
                let mult = 0;
                const userChoice = bet.betOn.toLowerCase();

                if (userChoice == finalNum.toString()) { isWin = true; mult = 9; }
                else if (userChoice === size.toLowerCase()) { isWin = true; mult = 2; }
                else if (color.includes(userChoice)) {
                    isWin = true;
                    mult = (userChoice === 'violet') ? 4.5 : (finalNum === 0 || finalNum === 5) ? 1.5 : 2;
                }

                if (isWin) {
                    const winAmount = bet.amount * mult;
                    // बैलेंस अपडेट (User model में phoneNumber ही होना चाहिए)
                    await User.updateOne({ phoneNumber: bet.phone }, { $inc: { balance: winAmount } });
                    // बेट अपडेट
                    await Bet.updateOne({ _id: bet._id }, { $set: { status: 'won', winAmount, result: finalNum } });
                } else {
                    await Bet.updateOne({ _id: bet._id }, { $set: { status: 'lost', winAmount: 0, result: finalNum } });
                }
            }
            return res.status(200).json({ success: true, data: savedResult });
        } catch (e) { return res.status(500).json({ error: e.message }); }
    }
}
