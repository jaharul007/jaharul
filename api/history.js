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
            let finalNum;

            // 1. Check if result already exists
            const existingResult = await Result.findOne({ period, mode: parseInt(mode) });

            if (existingResult && !isAdmin) {
                return res.json({ success: true, message: "Result already exists", data: existingResult });
            }

            // 2. Decide Number (Admin Force or Random)
            finalNum = (isAdmin && number !== undefined) ? parseInt(number) : Math.floor(Math.random() * 10);

            const color = (finalNum === 0) ? ['red', 'violet'] : 
                          (finalNum === 5) ? ['green', 'violet'] : 
                          (finalNum % 2 === 0) ? ['red'] : ['green'];
            const size = (finalNum >= 5) ? 'Big' : 'Small';

            // 3. Save or Update Result
            let savedResult;
            if (isAdmin && existingResult) {
                // Admin is overwriting an existing random result
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

            // =====================================================
            // 4. SETTLEMENT LOGIC (Winning Payout)
            // =====================================================
            // Agar Admin ne result badla hai, toh pehle purani win amounts ko reverse karna padta hai (optional but safe)
            // Filhal hum sirf Pending aur is Period ki bets process karenge.
            const bets = await Bet.find({ period, mode: parseInt(mode) });

            for (let bet of bets) {
                let isWin = false;
                let mult = 0;
                const betOn = bet.betOn.toLowerCase();

                // Logic for Winning
                if (betOn === finalNum.toString()) { 
                    isWin = true; mult = 9; 
                } else if (betOn === size.toLowerCase()) { 
                    isWin = true; mult = 2; 
                } else if (color.includes(betOn)) { 
                    isWin = true;
                    if (betOn === 'violet') mult = 4.5;
                    else if (finalNum === 0 || finalNum === 5) mult = 1.5;
                    else mult = 2;
                }

                if (isWin) {
                    const winAmount = bet.amount * mult;
                    
                    // Update User Balance (Sirf tab jab status pending ho ya result change hua ho)
                    if (bet.status !== 'won') {
                        await User.findOneAndUpdate(
                            { phoneNumber: bet.phone },
                            { $inc: { balance: winAmount } }
                        );
                    }
                    
                    // Update Bet Status
                    await Bet.updateOne(
                        { _id: bet._id },
                        { $set: { status: 'won', winAmount: winAmount, result: finalNum } }
                    );
                } else {
                    // Agar haar gaya (ya admin ne result badla aur ab haar gaya)
                    // Status ko update karein
                    await Bet.updateOne(
                        { _id: bet._id },
                        { $set: { status: 'lost', winAmount: 0, result: finalNum } }
                    );
                }
            }

            return res.status(200).json({ success: true, message: "Settlement Completed", data: savedResult });

        } catch (e) {
            console.error("History POST Error:", e);
            return res.status(500).json({ success: false, error: e.message });
        }
    }

    // GET Request (History Fetching)
    if (req.method === 'GET') {
        try {
            const { mode, page = 1, limit = 10 } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const historyData = await Result.find({ mode: parseInt(mode) })
                .sort({ period: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            return res.status(200).json({
                success: true,
                results: historyData.map(item => ({ p: item.period, n: item.number, c: item.color, s: item.size })),
            });
        } catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    }
}