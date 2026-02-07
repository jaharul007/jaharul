import mongoose from 'mongoose';
import Bet from '../models/Bet.js';
import User from '../models/User.js';
import Result from '../models/Result.js';

const connectDB = async () => {
    if (mongoose.connections && mongoose.connections[0].readyState) return;
    await mongoose.connect(process.env.MONGO_URI);
};

export default async function handler(req, res) {
    await connectDB();

    if (req.method === 'POST') {
        const { period, mode, number, isAdmin } = req.query.isAdmin ? req.query : req.body;

        try {
            // 1. रिज़ल्ट तय करें (अगर एडमिन ने नहीं भेजा तो रैंडम)
            const finalNumber = (number !== undefined) ? parseInt(number) : Math.floor(Math.random() * 10);
            const finalColor = (finalNumber === 0 || finalNumber === 5) ? 'Violet' : (finalNumber % 2 === 0 ? 'Red' : 'Green');
            const finalSize = finalNumber >= 5 ? 'Big' : 'Small';

            // 2. रिज़ल्ट को Results कलेक्शन में सेव करें
            await Result.findOneAndUpdate(
                { period, mode },
                { number: finalNumber, color: finalColor, size: finalSize, timestamp: new Date() },
                { upsert: true }
            );

            // 3. इस पीरियड के सभी 'pending' बेट्स निकालें
            const pendingBets = await Bet.find({ period, mode, status: 'pending' });

            if (pendingBets.length > 0) {
                for (let bet of pendingBets) {
                    let isWin = false;
                    let winAmount = 0;

                    // जीतने का लॉजिक
                    if (bet.betOn === finalNumber.toString()) {
                        isWin = true;
                        winAmount = bet.amount * 9; // Number win 9X
                    } else if (bet.betOn === finalColor) {
                        isWin = true;
                        winAmount = (finalNumber === 0 || finalNumber === 5) ? bet.amount * 1.5 : bet.amount * 2;
                    } else if (bet.betOn === finalSize) {
                        isWin = true;
                        winAmount = bet.amount * 2;
                    } else if (bet.betOn === 'Violet' && (finalNumber === 0 || finalNumber === 5)) {
                        isWin = true;
                        winAmount = bet.amount * 4.5;
                    }

                    if (isWin) {
                        // ✅ यूजर का बैलेंस बढ़ाएं
                        await User.findOneAndUpdate(
                            { phoneNumber: bet.phoneNumber },
                            { $inc: { balance: winAmount } }
                        );
                        // बेट स्टेटस अपडेट करें
                        bet.status = 'won';
                        bet.winAmount = winAmount;
                    } else {
                        bet.status = 'lost';
                        bet.winAmount = 0;
                    }
                    bet.resultNumber = finalNumber;
                    await bet.save();
                }
            }

            return res.status(200).json({ success: true, message: "Result declared and Balances updated!" });

        } catch (error) {
            console.error("Distributor Error:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
}
