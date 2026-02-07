import mongoose from 'mongoose';
import User from '../models/User.js';
import Bet from '../models/Bet.js';
import Result from '../models/Result.js';

const connectDB = async () => {
    if (mongoose.connections && mongoose.connections[0].readyState) return;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected Successfully");
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
    }
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    await connectDB();

    // ========================================
    // GET REQUEST: स्टेटस चेक और एडमिन समरी
    // ========================================
    if (req.method === 'GET') {
        const { phone, period, mode } = req.query;

        try {
            // 1. यूजर के लिए बेट का स्टेटस चेक करना (अब सिर्फ डेटा दिखाना है, कैलकुलेट नहीं करना)
            if (phone && period) {
                const bet = await Bet.findOne({ phone, period, mode: parseInt(mode) });
                if (!bet) return res.json({ status: 'no_bet' });

                // अगर बेट अभी भी पेंडिंग है तो रिजल्ट का इंतज़ार करें
                if (bet.status === 'pending') {
                    return res.json({ status: 'pending' });
                }

                // अगर पेंडिंग नहीं है, तो रिजल्ट दिखाएं (history.js पहले ही कैलकुलेट कर चुका होगा)
                return res.json({ 
                    status: bet.status, 
                    winAmount: bet.winAmount,
                    resultNumber: bet.result 
                });
            }

            // 2. एडमिन के लिए लाइव बेट समरी (Same as before)
            if (period && mode && !phone) {
                const pendingBets = await Bet.find({ period, mode: parseInt(mode) }).lean();
                const colorSums = { Green: 0, Violet: 0, Red: 0 };
                const numberSums = {};
                for (let i = 0; i <= 9; i++) numberSums[i] = 0;

                pendingBets.forEach(bet => {
                    const betVal = bet.betOn.toLowerCase();
                    if (['green', 'violet', 'red'].includes(betVal)) {
                        const key = betVal.charAt(0).toUpperCase() + betVal.slice(1);
                        colorSums[key] += bet.amount;
                    }
                    if (!isNaN(bet.betOn) && bet.betOn >= 0 && bet.betOn <= 9) {
                        numberSums[bet.betOn] += bet.amount;
                    }
                });

                const users = await User.find({}).select('phoneNumber balance').lean();
                const userList = users.map(u => ({
                    phoneNumber: u.phoneNumber,
                    balance: u.balance,
                    activeBets: pendingBets.filter(b => b.phone === u.phoneNumber).length
                }));

                return res.json({ success: true, colorSums, numberSums, userList });
            }

        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // ========================================
    // POST REQUEST: बेट लगाना (पैसा काटना)
    // ========================================
    if (req.method === 'POST') {
        try {
            const { phone, period, mode, betOn, amount, betType } = req.body;
            const betAmount = parseFloat(amount);

            // बैलेंस चेक और कटौती (Atomic Update)
            const updateResult = await User.updateOne(
                { phoneNumber: phone, balance: { $gte: betAmount } },
                { $inc: { balance: -betAmount } }
            );

            if (updateResult.matchedCount === 0) {
                return res.status(400).json({ success: false, message: 'बैलेंस कम है!' });
            }

            // बेट रिकॉर्ड बनाना
            await Bet.create({
                phone, period, mode: parseInt(mode),
                betOn: String(betOn), amount: betAmount,
                status: 'pending', betType: betType || 'number',
                timestamp: new Date()
            });

            const user = await User.findOne({ phoneNumber: phone });
            return res.status(200).json({ success: true, newBalance: user.balance });

        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
}
