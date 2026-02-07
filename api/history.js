import mongoose from 'mongoose';
import Result from '../models/Result.js';
import User from '../models/User.js'; 
import Bet from '../models/Bet.js';

const connectDB = async () => {
    if (mongoose.connections && mongoose.connections[0].readyState) return;
    try {
        await mongoose.connect(process.env.MONGO_URI);
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
    }
};

export default async function handler(req, res) {
    await connectDB();

    if (req.method === 'POST') {
        try {
            const { period, mode, number, isAdmin } = req.body;

            // 1. चेक करें कि रिजल्ट पहले से तो नहीं है
            const existing = await Result.findOne({ period, mode: parseInt(mode) });
            if (existing) return res.json({ success: true, message: "Result already exists", data: existing });

            // 2. रिजल्ट नंबर तय करना (Admin Force या Random)
            let finalNum = (isAdmin && number !== undefined) ? parseInt(number) : Math.floor(Math.random() * 10);

            const color = (finalNum === 0) ? ['red', 'violet'] : 
                          (finalNum === 5) ? ['green', 'violet'] : 
                          (finalNum % 2 === 0) ? ['red'] : ['green'];
            const size = (finalNum >= 5) ? 'Big' : 'Small';

            // 3. रिजल्ट को सेव करें
            const savedResult = await Result.create({
                period, mode: parseInt(mode), number: finalNum,
                color, size, isForced: isAdmin || false, timestamp: new Date()
            });

            // =====================================================
            // 4. SETTLEMENT LOGIC (जीतने वालों को पैसा बांटना)
            // =====================================================
            const pendingBets = await Bet.find({ period, mode: parseInt(mode), status: 'pending' });

            if (pendingBets.length > 0) {
                for (let bet of pendingBets) {
                    let isWin = false;
                    let mult = 0;
                    const betOn = bet.betOn.toLowerCase();

                    // Winning Logic
                    if (betOn == finalNum.toString()) { // Number Match
                        isWin = true; mult = 9;
                    } else if (betOn === size.toLowerCase()) { // Size Match
                        isWin = true; mult = 2;
                    } else if (color.includes(betOn)) { // Color Match
                        isWin = true;
                        if (betOn === 'violet') mult = 4.5;
                        else if (finalNum === 0 || finalNum === 5) mult = 1.5;
                        else mult = 2;
                    }

                    if (isWin) {
                        const winAmount = bet.amount * mult;
                        // यूजर का बैलेंस बढ़ाएं
                        await User.updateOne({ phoneNumber: bet.phone }, { $inc: { balance: winAmount } });
                        // बेट स्टेटस अपडेट करें
                        await Bet.updateOne({ _id: bet._id }, { $set: { status: 'won', winAmount, result: finalNum } });
                    } else {
                        // हारने वालों का स्टेटस अपडेट
                        await Bet.updateOne({ _id: bet._id }, { $set: { status: 'lost', winAmount: 0, result: finalNum } });
                    }
                }
            }

            return res.status(200).json({ success: true, message: "Result & Payout Done", data: savedResult });

        } catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    }

    // GET Request (History Fetching) - Same as before
    if (req.method === 'GET') {
        try {
            const { mode, page = 1, limit = 10 } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const historyData = await Result.find({ mode: parseInt(mode) }).sort({ period: -1 }).skip(skip).limit(parseInt(limit)).lean();
            const total = await Result.countDocuments({ mode: parseInt(mode) });

            return res.status(200).json({
                success: true,
                results: historyData.map(item => ({ p: item.period, n: item.number, c: item.color, s: item.size })),
                totalPages: Math.ceil(total / limit)
            });
        } catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    }
}
