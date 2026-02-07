import mongoose from 'mongoose';
import User from '../models/User.js';
import Bet from '../models/Bet.js';
import Result from '../models/Result.js';

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
    // GET REQUESTS
    // ========================================
    if (req.method === 'GET') {
        const { phone, period, mode } = req.query;

        try {
            // --- CHECK BET RESULT (Win/Loss Status) ---
            if (phone && period) {
                const result = await Result.findOne({ 
                    period: period, 
                    mode: parseInt(mode) 
                });

                if (!result) {
                    return res.json({ status: 'pending' });
                }

                const bet = await Bet.findOne({ 
                    phone, 
                    period, 
                    status: 'pending' 
                });

                if (!bet) {
                    const alreadyChecked = await Bet.findOne({ phone, period });
                    return res.json({ 
                        status: alreadyChecked ? alreadyChecked.status : 'no_bet', 
                        resultNumber: result.number 
                    });
                }

                // ===== WINNING LOGIC =====
                const finalNum = result.number;
                let isWin = false;
                let mult = 0;

                const winSize = finalNum >= 5 ? 'Big' : 'Small';
                // In dono lines ko lowercase kar dein
const winColors = (finalNum === 0) ? ['red', 'violet'] : 
                  (finalNum === 5) ? ['green', 'violet'] : 
                  (finalNum % 2 === 0) ? ['red'] : ['green'];

                // Number match (9x)
                if (bet.betOn == finalNum) { 
                    isWin = true; 
                    mult = 9; 
                }
                // Size match (2x) - Fixed Case Sensitivity
else if (bet.betOn.toLowerCase() === winSize.toLowerCase()) { 
    isWin = true; 
    mult = 2; 
}
                // Color match logic (Fixed Case Sensitivity)
else if (winColors.includes(bet.betOn.toLowerCase())) {
    isWin = true;
    const userBet = bet.betOn.toLowerCase(); 

    if (userBet === 'violet') { 
        mult = 4.5;
    } else if (finalNum === 0 || finalNum === 5) {
        mult = 1.5; 
    } else {
        mult = 2;
    }
}

                // Process WIN
                if (isWin) {
                    const winAmount = bet.amount * mult;
                    
                    // Update user balance
                    await User.updateOne(
                        { phoneNumber: phone }, 
                        { $inc: { balance: winAmount } }
                    );
                    
                    // Update bet status
                    await Bet.updateOne(
                        { _id: bet._id }, 
                        { $set: { status: 'won', winAmount, result: finalNum } }
                    );
                    
                    return res.json({ 
                        status: 'won', 
                        winAmount, 
                        resultNumber: finalNum 
                    });
                } 
                // Process LOSS
                else {
                    await Bet.updateOne(
                        { _id: bet._id }, 
                        { $set: { status: 'lost', winAmount: 0, result: finalNum } }
                    );
                    
                    return res.json({ 
                        status: 'lost', 
                        resultNumber: finalNum 
                    });
                }
            }

            // --- ADMIN: GET LIVE BET SUMMARY ---
            if (period && mode && !phone) {
                const pendingBets = await Bet.find({ 
                    period: period, 
                    mode: parseInt(mode) 
                }).lean();

                // Calculate summaries
                const colorSums = { Green: 0, Violet: 0, Red: 0 };
                const numberSums = {};
                
                for (let i = 0; i <= 9; i++) {
                    numberSums[i] = 0;
                }

                pendingBets.forEach(bet => {
                    if (['green', 'violet', 'red'].includes(bet.betOn.toLowerCase())) {
    // bet.betOn ko pehle normalize karein
    const normalizedColor = bet.betOn.charAt(0).toUpperCase() + bet.betOn.slice(1).toLowerCase();
    colorSums[normalizedColor] += bet.amount;
}
                    if (!isNaN(bet.betOn) && bet.betOn >= 0 && bet.betOn <= 9) {
                        numberSums[bet.betOn] += bet.amount;
                    }
                });

                // Get all users with active bets
                const users = await User.find({}).lean();
                const userBetCounts = {};
                
                pendingBets.forEach(bet => {
                    userBetCounts[bet.phone] = (userBetCounts[bet.phone] || 0) + 1;
                });

                const userList = users.map(u => ({
                    phoneNumber: u.phoneNumber,
                    balance: u.balance,
                    activeBets: userBetCounts[u.phoneNumber] || 0
                }));

                return res.json({ 
                    success: true, 
                    bets: pendingBets,
                    colorSums,
                    numberSums,
                    userList
                });
            }

        } catch (e) {
            console.error("GET Error:", e);
            return res.status(500).json({ error: e.message });
        }
    }

    // ========================================
    // POST REQUESTS
    // ========================================
    if (req.method === 'POST') {
        try {
            const body = req.body;

            // --- PLACE BET ---
            if (body.phone && body.period && body.betOn && body.amount) {
                const { phone, period, mode, betOn, amount, betType, multiplier } = body;
                const betAmount = parseFloat(amount);

                // Check and deduct balance
                const updateResult = await User.updateOne(
                    { phoneNumber: phone, balance: { $gte: betAmount } },
                    { $inc: { balance: -betAmount } }
                );

                if (updateResult.matchedCount === 0) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Insufficient balance!' 
                    });
                }

                // Create bet
                await Bet.create({
                    phone,
                    period,
                    mode: parseInt(mode),
                    betOn: String(betOn),
                    amount: betAmount,
                    status: 'pending',
                    betType: betType || 'number',
                    multiplier: multiplier || 1,
                    timestamp: new Date()
                });

                // Get updated balance
                const user = await User.findOne({ phoneNumber: phone });

                return res.status(200).json({ 
                    success: true, 
                    newBalance: user.balance,
                    message: 'Bet placed successfully'
                });
            }

        } catch (e) {
            console.error("POST Error:", e);
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}