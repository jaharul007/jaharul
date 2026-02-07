import mongoose from 'mongoose';
import User from '../models/User.js';
import Bet from '../models/Bet.js';
import Result from '../models/Result.js';

const connectDB = async () => {
    if (mongoose.connections && mongoose.connections[0].readyState) {
        return;
    }
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB Connected");
    } catch (error) {
        console.error("❌ MongoDB Error:", error);
    }
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    await connectDB();

    // ========================================
    // GET: सिर्फ स्टेटस चेक करने के लिए (नो विनिंग लॉजिक)
    // ========================================
    if (req.method === 'GET') {
        const { phone, period, mode } = req.query;

        try {
            if (phone && period) {
                // सीधे डेटाबेस से स्टेटस उठाओ (क्योंकि history.js इसे अपडेट कर चुका होगा)
                const bet = await Bet.findOne({ 
                    phoneNumber: phone, 
                    period, 
                    mode: parseInt(mode)
                });

                if (!bet) {
                    return res.json({ status: 'no_bet' });
                }

                return res.json({ 
                    status: bet.status, // 'pending', 'won', or 'lost'
                    winAmount: bet.winAmount || 0,
                    resultNumber: bet.result 
                });
            }

            // एडमिन के लिए समरी (अगर जरुरत हो)
            if (period && mode && !phone) {
                const pendingBets = await Bet.find({ period, mode: parseInt(mode) }).lean();
                return res.json({ success: true, bets: pendingBets });
            }

        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // ========================================
    // POST: सिर्फ पैसा काटना और बेट लगाना
    // ========================================
    if (req.method === 'POST') {
        try {
            const { phone, period, mode, betOn, amount, betType, multiplier } = req.body;

            if (phone && period && betOn && amount) {
                const betAmount = parseFloat(amount);
                const user = await User.findOne({ phoneNumber: phone });
                
                if (!user) return res.status(404).json({ success: false, message: 'User not found!' });

                if (user.balance < betAmount) {
                    return res.status(400).json({ success: false, message: 'Insufficient balance!' });
                }

                // 1. बैलेंस काटो
                await User.updateOne(
                    { phoneNumber: phone },
                    { $inc: { balance: -betAmount } }
                );

                // 2. बेट सेव करो (status 'pending' रहेगा)
                await Bet.create({
                    phoneNumber: phone,
                    period,
                    mode: parseInt(mode),
                    betOn: String(betOn),
                    amount: betAmount,
                    status: 'pending',
                    betType: betType || 'number',
                    multiplier: multiplier || 1,
                    timestamp: new Date()
                });

                const updatedUser = await User.findOne({ phoneNumber: phone });

                return res.status(200).json({ 
                    success: true, 
                    newBalance: updatedUser.balance,
                    message: 'Bet placed successfully'
                });
            }

        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}
