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
            const { period, mode, number, isAdmin } = req.body;

            if (!period || mode === undefined) {
                return res.status(400).json({ success: false, message: "Period or Mode missing" });
            }

            // 1. रिज़ल्ट चेक और सेट करना
            let existing = await Result.findOne({ period: period.toString(), mode: parseInt(mode) });

            if (existing && isAdmin && number !== undefined) {
                await Result.deleteOne({ period: period.toString(), mode: parseInt(mode) });
            } else if (existing) {
                return res.json({ success: true, message: "Result already exists", number: existing.number });
            }

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

            // 2. रिज़ल्ट डेटाबेस में डालना
            const savedResult = await Result.create({
                period: period.toString(),
                mode: parseInt(mode),
                number: finalNum,
                color: winColors,
                size: winSize,
                timestamp: new Date()
            });

            // 3. 💰 ऑटो-पेमेंट लॉजिक (Paisa बांटना)
            // 'pending' बेट्स ढूंढना (period को String/Number दोनों में चेक कर रहा हूँ)
            const pendingBets = await Bet.find({ 
                period: { $in: [period.toString(), period] }, 
                mode: parseInt(mode), 
                status: 'pending' 
            });

            console.log(`🔎 Period ${period}: Found ${pendingBets.length} bets to process.`);

            for (let bet of pendingBets) {
                let isWin = false;
                let mult = 0;

                // Win logic (== का इस्तेमाल ताकि String/Number मैच हो जाए)
                if (bet.betOn == finalNum) { isWin = true; mult = 9; }
                else if (bet.betOn === winSize) { isWin = true; mult = 2; }
                else if (winColors.includes(bet.betOn)) {
                    isWin = true;
                    // Violet logic: 0/5 आने पर Green/Red 1.5x मिलता है, Violet 4.5x
                    mult = (bet.betOn === 'Violet') ? 4.5 : (finalNum === 0 || finalNum === 5 ? 1.5 : 2);
                }

                // यूजर का फ़ोन नंबर निकालें (तेरा मॉडल phoneNumber यूज़ कर रहा है)
                const userPhone = bet.phoneNumber || bet.phone;

                if (isWin) {
                    const winAmount = bet.amount * mult;
                    console.log(`✅ Winning: User ${userPhone} won ₹${winAmount}`);

                    // 1. यूजर के बैलेंस में पैसा जोड़ो
                    await User.updateOne(
                        { phoneNumber: userPhone }, 
                        { $inc: { balance: winAmount } }
                    );

                    // 2. बेट का स्टेटस 'won' करो
                    await Bet.updateOne(
                        { _id: bet._id }, 
                        { $set: { status: 'won', winAmount: winAmount, result: finalNum } }
                    );
                } else {
                    // हारने वालों का स्टेटस 'lost' करो
                    await Bet.updateOne(
                        { _id: bet._id }, 
                        { $set: { status: 'lost', winAmount: 0, result: finalNum } }
                    );
                }
            }

            return res.status(200).json({ success: true, number: finalNum });

        } catch (e) {
            console.error("❌ POST Error in history.js:", e);
            return res.status(500).json({ success: false, error: e.message });
        }
    }

    // ========================================
    // GET: FETCH HISTORY
    // ========================================
    if (req.method === 'GET') {
        try {
            const { mode, page = 1, limit = 10 } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const historyData = await Result.find({ mode: parseInt(mode) })
                .sort({ timestamp: -1 }) // ताज़ा रिज़ल्ट सबसे ऊपर
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await Result.countDocuments({ mode: parseInt(mode) });

            return res.status(200).json({
                success: true,
                results: historyData.map(i => ({ 
                    p: i.period, 
                    n: i.number, 
                    c: i.color, 
                    s: i.size 
                })),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            });
        } catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}
