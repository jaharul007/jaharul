import mongoose from 'mongoose';
import User from '../models/User.js';
import Bet from '../models/Bet.js';
import Result from '../models/Result.js';

const connectDB = async () => {
    if (mongoose.connections && mongoose.connections[0].readyState) return;
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
    // GET: स्टेटस चेक करने के लिए
    // ========================================
    if (req.method === 'GET') {
        const { phone, period, mode } = req.query;

        try {
            if (phone && period) {
                // यहाँ period को String में ढूंढना जरूरी है
                const bet = await Bet.findOne({ 
                    phoneNumber: phone, 
                    period: period.toString(), 
                    mode: parseInt(mode)
                }).sort({ timestamp: -1 }); // ताज़ा बेट पहले

                if (!bet) return res.json({ status: 'no_bet' });

                return res.json({ 
                    status: bet.status, 
                    winAmount: bet.winAmount || 0,
                    resultNumber: bet.result 
                });
            }
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // ========================================
    // POST: बेट लगाना और पैसा काटना
    // ========================================
    if (req.method === 'POST') {
        try {
            const { phone, period, mode, betOn, amount, betType, multiplier } = req.body;

            if (!phone || !period || !betOn || !amount) {
                return res.status(400).json({ success: false, message: 'Missing fields' });
            }

            const betAmount = parseFloat(amount);
            const user = await User.findOne({ phoneNumber: phone });
            
            if (!user) return res.status(404).json({ success: false, message: 'User not found!' });
            if (user.balance < betAmount) return res.status(400).json({ success: false, message: 'Insufficient balance!' });

            // 1. बैलेंस काटो
            await User.updateOne(
                { phoneNumber: phone },
                { $inc: { balance: -betAmount } }
            );

            // 2. बेट सेव करो (period को String बना कर सेव करें ताकि history.js उसे ढूंढ सके)
            await Bet.create({
                phoneNumber: phone,
                period: period.toString(), 
                mode: parseInt(mode),
                betOn: betOn.toString(),
                amount: betAmount,
                status: 'pending',
                betType: betType || 'number',
                multiplier: multiplier || 1,
                timestamp: new Date()
            });

            return res.status(200).json({ 
                success: true, 
                newBalance: user.balance - betAmount,
                message: 'Bet placed successfully'
            });

        } catch (e) {
            console.error("❌ Bet Error:", e);
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}
