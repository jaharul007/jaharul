limport mongoose from 'mongoose';
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

    if (req.method === 'POST') {
        try {
            const { period, mode, number, isAdmin } = req.body;

            if (!period || mode === undefined) {
                return res.status(400).json({ success: false, message: "Period or Mode missing" });
            }

            // 1. रिज़ल्ट चेक और सेट करना
            let existing = await Result.findOne({ period: period.toString(), mode: parseInt(mode) });
            if (existing && !isAdmin) {
                return res.json({ success: true, message: "Result already exists", number: existing.number });
            }
            if (existing && isAdmin) {
                await Result.deleteOne({ period: period.toString(), mode: parseInt(mode) });
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

            // 2. रिज़ल्ट सेव करना
            await Result.create({
                period: period.toString(),
                mode: parseInt(mode),
                number: finalNum,
                color: winColors,
                size: winSize,
                timestamp: new Date()
            });

            // 3. 💰 ऑटो-पेमेंट लॉजिक
            const pendingBets = await Bet.find({ 
                period: period.toString(), 
                mode: parseInt(mode), 
                status: 'pending' 
            });

            console.log(`🔎 Period ${period}: Found ${pendingBets.length} bets.`);

            for (let bet of pendingBets) {
                let isWin = false;
                let mult = 0;

                // ✅ सेफ्टी: 'betOn' और 'beton' दोनों चेक करेगा ताकि कोड कभी फेल न हो
                const userChoice = bet.betOn || bet.beton;

                if (userChoice == finalNum) { isWin = true; mult = 9; }
                else if (userChoice === winSize) { isWin = true; mult = 2; }
                else if (winColors.includes(userChoice)) {
                    isWin = true;
                    mult = (userChoice === 'Violet') ? 4.5 : (finalNum === 0 || finalNum === 5 ? 1.5 : 2);
                }

                // ✅ नंबर को String में बदल कर Trim करना (स्पेस की समस्या खत्म)
                const userPhone = (bet.phoneNumber || bet.phone).toString().trim();

                if (isWin) {
                    const winAmount = bet.amount * mult;
                    
                    // 💸 यहाँ पैसा बढ़ेगा (updateOne की जगह findOneAndUpdate use किया ताकि Log मिल सके)
                    const updated = await User.findOneAndUpdate(
                        { phoneNumber: userPhone }, 
                        { $inc: { balance: winAmount } },
                        { new: true }
                    );

                    if (updated) {
                        console.log(`✅ Paid ₹${winAmount} to ${userPhone}. New Bal: ${updated.balance}`);
                    } else {
                        console.log(`❌ User NOT FOUND: Could not pay ${userPhone}`);
                    }

                    await Bet.updateOne({ _id: bet._id }, { 
                        $set: { status: 'won', winAmount: winAmount, result: finalNum } 
                    });
                } else {
                    await Bet.updateOne({ _id: bet._id }, { 
                        $set: { status: 'lost', winAmount: 0, result: finalNum } 
                    });
                }
            }

            return res.status(200).json({ success: true, number: finalNum });

        } catch (e) {
            console.error("❌ POST Error:", e);
            return res.status(500).json({ success: false, error: e.message });
        }
    }

    // GET logic remains same...
    if (req.method === 'GET') {
        try {
            const { mode, page = 1, limit = 10 } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const historyData = await Result.find({ mode: parseInt(mode) }).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit)).lean();
            const total = await Result.countDocuments({ mode: parseInt(mode) });
            return res.status(200).json({
                success: true,
                results: historyData.map(i => ({ p: i.period, n: i.number, c: i.color, s: i.size })),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            });
        } catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    }
}
