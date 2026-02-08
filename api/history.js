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

// फोन नंबर को +91 फॉर्मेट में बदलने का फंक्शन
const formatPhone = (phone) => {
    const clean = String(phone).replace(/\D/g, ""); // सिर्फ नंबर निकालो
    const last10 = clean.slice(-10); // आखरी के 10 अंक लो
    return `+91${last10}`;
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    await connectDB();

    // ========================================
    // GET REQUESTS (Check Result / History)
    // ========================================
    if (req.method === 'GET') {
        const { action, phone, period, mode, page = 1, limit = 10 } = req.query;

        try {
            if (action === 'checkResult' && phone && period) {
                const searchPhone = formatPhone(phone);
                const searchPeriod = String(period).trim();
                const searchMode = parseInt(mode);

                const result = await Result.findOne({ period: searchPeriod, mode: searchMode });
                if (!result) return res.json({ status: 'pending' });

                // पेंडिंग बेट ढूंढो (+91 वाले नंबर के साथ)
                const bet = await Bet.findOne({ 
                    phoneNumber: searchPhone, 
                    period: searchPeriod, 
                    status: 'pending' 
                });

                if (!bet) {
                    const processedBet = await Bet.findOne({ phoneNumber: searchPhone, period: searchPeriod });
                    return res.json({ 
                        status: processedBet ? processedBet.status : 'no_bet', 
                        resultNumber: result.number,
                        winAmount: processedBet ? processedBet.winAmount : 0
                    });
                }

                // विनिंग कैलकुलेशन
                const finalNum = parseInt(result.number);
                let isWin = false;
                let mult = 0;
                const winSize = finalNum >= 5 ? 'Big' : 'Small';
                const winColors = result.color.map(c => c.toLowerCase());
                const userBetOn = String(bet.betOn).trim().toLowerCase();

                if (bet.betOn == finalNum) { isWin = true; mult = 9; }
                else if (bet.betOn === winSize) { isWin = true; mult = 2; }
                else if (winColors.includes(userBetOn)) {
                    isWin = true;
                    mult = (userBetOn === 'violet') ? 4.5 : (finalNum === 0 || finalNum === 5 ? 1.5 : 2);
                }

                if (isWin) {
                    const winAmount = parseFloat(bet.amount) * mult;
                    
                    // 1. बैलेंस बढ़ाओ
                    const updateBal = await User.updateOne(
                        { phoneNumber: searchPhone }, 
                        { $inc: { balance: winAmount } }
                    );

                    if (updateBal.modifiedCount > 0) {
                        // 2. बेट स्टेटस अपडेट करो
                        await Bet.updateOne(
                            { _id: bet._id }, 
                            { $set: { status: 'won', winAmount, result: finalNum } }
                        );
                        const user = await User.findOne({ phoneNumber: searchPhone });
                        return res.json({ status: 'won', winAmount, resultNumber: finalNum, newBalance: user.balance });
                    }
                    return res.status(500).json({ status: 'error', message: 'Balance update failed' });
                } else {
                    await Bet.updateOne(
                        { _id: bet._id }, 
                        { $set: { status: 'lost', winAmount: 0, result: finalNum } }
                    );
                    return res.json({ status: 'lost', resultNumber: finalNum });
                }
            }

            // Get History Logic (Same as before)
            if (!action || action === 'getHistory') {
                const historyData = await Result.find({ mode: parseInt(mode) }).sort({ period: -1 }).skip((page - 1) * limit).limit(parseInt(limit)).lean();
                return res.json({ success: true, results: historyData.map(i => ({ p: i.period, n: i.number, c: i.color, s: i.size })) });
            }

        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // ========================================
    // POST REQUESTS (Place Bet / Generate Result)
    // ========================================
    if (req.method === 'POST') {
        try {
            const { action, phone, period, mode, betOn, amount, number, isAdmin } = req.body;

            if (action === 'placeBet') {
                const searchPhone = formatPhone(phone); // यहाँ भी +91 पक्का किया
                const betAmount = parseFloat(amount);

                const user = await User.findOne({ phoneNumber: searchPhone });
                if (!user || user.balance < betAmount) {
                    return res.status(400).json({ success: false, message: 'Invalid User or Balance' });
                }

                // पैसे काटो
                await User.updateOne({ phoneNumber: searchPhone }, { $inc: { balance: -betAmount } });

                // बेट सेव करो (+91 के साथ)
                await Bet.create({
                    phoneNumber: searchPhone,
                    period,
                    mode: parseInt(mode),
                    betOn: String(betOn),
                    amount: betAmount,
                    status: 'pending'
                });

                const updated = await User.findOne({ phoneNumber: searchPhone });
                return res.json({ success: true, newBalance: updated.balance });
            }

            // Generate Result Logic (Same as before)
            if (action === 'generateResult') {
                let finalNum = (isAdmin && number !== undefined) ? parseInt(number) : Math.floor(Math.random() * 10);
                const color = (finalNum === 0) ? ['red', 'violet'] : (finalNum === 5) ? ['green', 'violet'] : (finalNum % 2 === 0) ? ['red'] : ['green'];
                const size = (finalNum >= 5) ? 'Big' : 'Small';

                await Result.deleteOne({ period, mode: parseInt(mode) }); // Admin force handle
                const saved = await Result.create({ period, mode: parseInt(mode), number: finalNum, color, size, timestamp: new Date() });
                return res.json({ success: true, number: finalNum, data: saved });
            }

        } catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    }
}
