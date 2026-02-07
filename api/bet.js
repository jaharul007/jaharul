import mongoose from 'mongoose';
import User from '../models/User.js';
import Bet from '../models/Bet.js';

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
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    await connectDB();

    // ========================================
    // GET: यूजर की बेट का स्टेटस चेक करने के लिए
    // ========================================
    if (req.method === 'GET') {
        const { phone, period, mode } = req.query;

        try {
            if (phone && period) {
                const bet = await Bet.findOne({ 
                    phoneNumber: phone.toString().trim(), 
                    period: period.toString(), 
                    mode: parseInt(mode)
                }).sort({ timestamp: -1 });

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
    // POST: बेट लगाना और बैलेंस काटना
    // ========================================
    if (req.method === 'POST') {
        try {
            const { phone, period, mode, betOn, amount, betType, multiplier } = req.body;

            // बेसिक वैलिडेशन
            if (!phone || !period || !betOn || !amount) {
                return res.status(400).json({ success: false, message: 'Missing fields' });
            }

            const betAmount = parseFloat(amount);
            const cleanPhone = phone.toString().trim();

            // 1. बैलेंस चेक करो और काटो (Atomic Update - सबसे सुरक्षित तरीका)
            // यह तभी पैसा काटेगा जब यूजर के पास पर्याप्त बैलेंस होगा
            const updatedUser = await User.findOneAndUpdate(
                { phoneNumber: cleanPhone, balance: { $gte: betAmount } },
                { $inc: { balance: -betAmount } },
                { new: true }
            );
            
            if (!updatedUser) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Insufficient balance or User not found!' 
                });
            }

            // 2. बेट सेव करो (बड़े 'O' यानी betOn के साथ)
            const newBet = await Bet.create({
                phoneNumber: cleanPhone,
                period: period.toString(), 
                mode: parseInt(mode),
                betOn: betOn.toString(), // ✅ तेरा 'O' बड़ा है यहाँ
                amount: betAmount,
                status: 'pending',
                betType: betType || 'number',
                multiplier: multiplier || 1,
                timestamp: new Date()
            });

            console.log(`✅ Bet Placed: ${cleanPhone} bet ₹${betAmount} on ${betOn}`);

            return res.status(200).json({ 
                success: true, 
                newBalance: updatedUser.balance,
                message: 'Bet placed successfully'
            });

        } catch (e) {
            console.error("❌ Bet Error:", e);
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}
