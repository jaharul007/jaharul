import mongoose from 'mongoose';
import Result from '../models/Result.js';
import User from '../models/User.js';
import Bet from '../models/Bet.js';
const connectDB = async () => {
    if (mongoose.connections && mongoose.connections[0].readyState) {
        return;
    }
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected Successfully");
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
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
    // POST: AUTO RESULT GENERATION / ADMIN FORCE
    // ========================================
    if (req.method === 'POST') {
        try {
            const { period, mode, number, isAdmin } = req.body;

                        if (!period || mode === undefined) {
                return res.status(400).json({ success: false, message: "Period or Mode missing" });
            }

            // पहले चेक करें कि क्या रिजल्ट मौजूद है
            const existing = await Result.findOne({ period: period, mode: parseInt(mode) });

            // अगर रिजल्ट है और आप एडमिन नहीं हैं, तो पुराना ही दिखाओ
            if (existing && !isAdmin) {
                return res.json({ success: true, message: "Result already exists", number: existing.number });
            }

            // नंबर तय करें (एडमिन वाला या रैंडम)
            let finalNum = (isAdmin && number !== undefined) ? parseInt(number) : Math.floor(Math.random() * 10);
            let isForced = !!isAdmin;

            const color = (finalNum === 0) ? ['red', 'violet'] : 
                          (finalNum === 5) ? ['green', 'violet'] : 
                          (finalNum % 2 === 0) ? ['red'] : ['green'];
            const size = (finalNum >= 5) ? 'Big' : 'Small';

            const resultDoc = {
                period, mode: parseInt(mode), number: finalNum, color, size, isForced, timestamp: new Date()
            };

            // अपडेट या क्रिएट करने का लॉजिक
            let savedResult;
            if (existing && isAdmin) {
                savedResult = await Result.findOneAndUpdate({ period, mode: parseInt(mode) }, resultDoc, { new: true });
            } else {
                savedResult = await Result.create(resultDoc);
            }

// 1. Is Period aur Mode ke saare Pending bets nikalein
const pendingBets = await Bet.find({ 
    period: period, 
    mode: parseInt(mode), 
    status: 'pending' 
});

// 2. Har bet ko check karein aur settle karein
for (let bet of pendingBets) {
    let isWin = false;
    let mult = 0;
    const userBet = bet.betOn.toLowerCase();

    // Winning Conditions (Same as bet.js)
    if (userBet == finalNum) { isWin = true; mult = 9; }
    else if (userBet === size.toLowerCase()) { isWin = true; mult = 2; }
    else if (color.includes(userBet)) {
        isWin = true;
        if (userBet === 'violet') mult = 4.5;
        else if (finalNum === 0 || finalNum === 5) mult = 1.5;
        else mult = 2;
    }

        if (isWin) {
        const winAmount = bet.amount * mult;
        
        // 1. यहाँ User के लिए 'phoneNumber' और Bet से 'phone' उठाना है
        await User.updateOne({ phoneNumber: bet.phone }, { $inc: { balance: winAmount } });
        
        // 2. Bet स्टेटस अपडेट
        await Bet.updateOne({ _id: bet._id }, { $set: { status: 'won', winAmount, result: finalNum } });
    } else {
        // हारने वाले के लिए
        await Bet.updateOne({ _id: bet._id }, { $set: { status: 'lost', winAmount: 0, result: finalNum } });
    }

// --- END OF SETTLEMENT ---

            console.log(`✅ Result Generated: Period ${period}, Mode ${mode}, Number ${finalNum}`);

            return res.status(200).json({ 
                success: true, 
                message: isForced ? "Result Forced by Admin" : "Result Auto-Generated",
                data: savedResult
            });

        } catch (e) {
            console.error("❌ History POST Error:", e);
            return res.status(500).json({ 
                success: false, 
                error: e.message 
            });
        }
    }

    // ========================================
    // GET: FETCH HISTORY FOR ALL MODES
    // ========================================
    if (req.method === 'GET') {
        try {
            const { mode, page = 1, limit = 10 } = req.query;

            if (mode === undefined) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Mode is required" 
                });
            }

            const pageLimit = parseInt(limit);
            const skip = (parseInt(page) - 1) * pageLimit;

            // Fetch results for specific mode
            const historyData = await Result
                .find({ mode: parseInt(mode) })
                .sort({ period: -1 }) // Latest first
                .skip(skip)
                .limit(pageLimit)
                .lean();

            // Total count for pagination
            const total = await Result.countDocuments({ mode: parseInt(mode) });

            // Format for frontend compatibility
            const formattedData = historyData.map(item => ({
                p: item.period,      // Period
                n: item.number,      // Number
                c: item.color,       // Color Array
                s: item.size,        // Big/Small
                t: item.timestamp    // Time
            }));

            return res.status(200).json({
                success: true,
                mode: parseInt(mode),
                results: formattedData,
                total: total,
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / pageLimit)
            });

        } catch (e) {
            console.error("❌ History GET Error:", e);
            return res.status(500).json({ 
                success: false, 
                error: e.message 
            });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}
