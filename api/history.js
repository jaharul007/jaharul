import mongoose from 'mongoose';
import Result from '../models/Result.js';
import User from '../models/User.js'; 
import Bet from '../models/Bet.js';

const connectDB = async () => {
    if (mongoose.connections && mongoose.connections[0].readyState) return;
    await mongoose.connect(process.env.MONGO_URI);
};

export default async function handler(req, res) {
    await connectDB();

    if (req.method === 'POST') {
        try {
            const { period, mode, number, isAdmin } = req.body;
            let finalNum;

            const existingResult = await Result.findOne({ period, mode: parseInt(mode) });

            // अगर रिजल्ट है और एडमिन नहीं है, तो वही पुराना भेज दो
            if (existingResult && !isAdmin) {
                return res.json({ success: true, message: "Result already exists", data: existingResult });
            }

            // 1. नंबर तय करना
            finalNum = (isAdmin && number !== undefined) ? parseInt(number) : Math.floor(Math.random() * 10);

            const color = (finalNum === 0) ? ['red', 'violet'] : 
                          (finalNum === 5) ? ['green', 'violet'] : 
                          (finalNum % 2 === 0) ? ['red'] : ['green'];
            const size = (finalNum >= 5) ? 'Big' : 'Small';

            // 2. रिजल्ट सेव या अपडेट (एडमिन के लिए)
            let savedResult;
            if (isAdmin && existingResult) {
                savedResult = await Result.findOneAndUpdate(
                    { period, mode: parseInt(mode) },
                    { number: finalNum, color, size, isForced: true },
                    { new: true }
                );
            } else {
                savedResult = await Result.create({
                    period, mode: parseInt(mode), number: finalNum,
                    color, size, isForced: isAdmin || false, timestamp: new Date()
                });
            }

            // 3. Payout Logic (जड़ यही थी)
            const bets = await Bet.find({ period, mode: parseInt(mode) });

            for (let bet of bets) {
                let isWin = false;
                let mult = 0;
                const betOn = bet.betOn.toLowerCase();

                if (betOn === finalNum.toString()) { isWin = true; mult = 9; } 
                else if (betOn === size.toLowerCase()) { isWin = true; mult = 2; } 
                else if (color.includes(betOn)) { 
                    isWin = true;
                    mult = (betOn === 'violet') ? 4.5 : (finalNum === 0 || finalNum === 5) ? 1.5 : 2;
                }

                if (isWin) {
                    const winAmount = bet.amount * mult;
                    
                    // अगर एडमिन ने नंबर बदला है, तो सिर्फ उन लोगों को पैसा मिलेगा जिनका स्टेटस अभी पेंडिंग था
                    // या जो अब नए नंबर से जीत रहे हैं।
                    if (bet.status !== 'won') {
                        // FIX: User model use 'phoneNumber', Bet model use 'phone'
                        await User.findOneAndUpdate(
                            { phoneNumber: bet.phone }, 
                            { $inc: { balance: winAmount } }
                        );
                    }
                    
                    await Bet.updateOne({ _id: bet._id }, { $set: { status: 'won', winAmount, result: finalNum } });
                } else {
                    // अगर हार गया तो स्टेटस 'lost'
                    await Bet.updateOne({ _id: bet._id }, { $set: { status: 'lost', winAmount: 0, result: finalNum } });
                }
            }

            return res.status(200).json({ success: true, message: "Settlement Done", data: savedResult });
        } catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    }

    // GET Request (History Fetching)
    if (req.method === 'GET') {
        const { mode } = req.query;
        const historyData = await Result.find({ mode: parseInt(mode) }).sort({ period: -1 }).limit(10).lean();
        return res.json({ success: true, results: historyData.map(item => ({ p: item.period, n: item.number, c: item.color, s: item.size })) });
    }
}
