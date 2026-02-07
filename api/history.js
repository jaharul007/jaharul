import mongoose from 'mongoose';
import Result from '../models/Result.js';
import Bet from '../models/Bet.js';   
import User from '../models/User.js'; 

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
    // POST: GENERATE RESULT & PAY WINNERS
    // ========================================
    if (req.method === 'POST') {
        try {
            // ✅ HTML से आने वाले डेटा को सही से पकड़ना
            const { period, mode, number, isAdmin } = req.body;

            if (!period || mode === undefined) {
                return res.status(400).json({ success: false, message: "Period or Mode missing" });
            }

            // 1. चेक करें कि रिज़ल्ट पहले से है या नहीं
            const existing = await Result.findOne({ period: period, mode: parseInt(mode) });

            if (existing) {
                // अगर एडमिन नया नंबर भेज रहा है तो पुराना डिलीट करें, वरना वही भेज दें
                if (isAdmin && number !== undefined) {
                    await Result.deleteOne({ period: period, mode: parseInt(mode) });
                } else {
                    return res.json({ success: true, message: "Result already exists", number: existing.number });
                }
            }

            // 2. नंबर तय करना
            let finalNum;
            if (isAdmin === true && (number !== undefined && number !== null && number !== '')) {
                finalNum = parseInt(number);
            } else {
                finalNum = Math.floor(Math.random() * 10);
            }

            const winSize = (finalNum >= 5) ? 'Big' : 'Small';
            let winColors = (finalNum === 0) ? ['Red', 'Violet'] : 
                            (finalNum === 5) ? ['Green', 'Violet'] : 
                            (finalNum % 2 === 0) ? ['Red'] : ['Green'];

            // 3. रिज़ल्ट सेव करना
            const savedResult = await Result.create({
                period: period.toString(), // Ensure string
                mode: parseInt(mode),
                number: finalNum,
                color: winColors,
                size: winSize,
                timestamp: new Date()
            });

            // 💰 विनिंग डिस्ट्रीब्यूशन (AUTO-PAYMENT)
            // यहाँ phoneNumber और phone दोनों चेक कर रहा हूँ ताकि गलती न हो
            const pendingBets = await Bet.find({ period: period.toString(), mode: parseInt(mode), status: 'pending' });

            for (let bet of pendingBets) {
                let isWin = false;
                let mult = 0;

                // जीत की जाँच (Loose equality == for string/number match)
                if (bet.betOn == finalNum) { isWin = true; mult = 9; }
                else if (bet.betOn === winSize) { isWin = true; mult = 2; }
                else if (winColors.includes(bet.betOn)) {
                    isWin = true;
                    mult = (bet.betOn === 'Violet') ? 4.5 : (finalNum === 0 || finalNum === 5 ? 1.5 : 2);
                }

                const userQuery = { phoneNumber: bet.phoneNumber };

                if (isWin) {
                    const winAmount = bet.amount * mult;
                    // ✅ बैलेंस अपडेट
                    await User.updateOne(userQuery, { $inc: { balance: winAmount } });
                    await Bet.updateOne({ _id: bet._id }, { $set: { status: 'won', winAmount: winAmount, result: finalNum } });
                } else {
                    await Bet.updateOne({ _id: bet._id }, { $set: { status: 'lost', winAmount: 0, result: finalNum } });
                }
            }

            return res.status(200).json({ success: true, number: finalNum });

        } catch (e) {
            console.error("❌ POST Error:", e);
            return res.status(500).json({ success: false, error: e.message });
        }
    }

    // ========================================
    // GET: FETCH HISTORY (यहीं गड़बड़ थी, इसे फिक्स किया)
    // ========================================
    if (req.method === 'GET') {
        try {
            const { mode, page = 1, limit = 10 } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // डेटाबेस से लेटेस्ट 10 हिस्ट्री निकालना
            const historyData = await Result.find({ mode: parseInt(mode) })
                .sort({ timestamp: -1 }) // टाइम के हिसाब से उल्टा
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await Result.countDocuments({ mode: parseInt(mode) });

            return res.status(200).json({
                success: true,
                results: historyData.map(i => ({ 
                    p: i.period, 
                    n: i.number, 
                    c: Array.isArray(i.color) ? i.color : [i.color], 
                    s: i.size 
                })),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            });
        } catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    }
}
