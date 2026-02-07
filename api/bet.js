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
    // GET: CHECK BET RESULT (Win/Loss)
    // ========================================
    if (req.method === 'GET') {
        const { phone, period, mode } = req.query;

        try {
            // Check bet result for user
            if (phone && period) {
                const result = await Result.findOne({ 
                    period: period, 
                    mode: parseInt(mode) 
                });

                if (!result) {
                    return res.json({ status: 'pending' });
                }

                // ✅ CHANGED: phone → phoneNumber
                const bet = await Bet.findOne({ 
                    phoneNumber: phone, 
                    period, 
                    status: 'pending' 
                });

                if (!bet) {
                    const alreadyChecked = await Bet.findOne({ phoneNumber: phone, period });
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
                const winColors = (finalNum === 0) ? ['Red', 'Violet'] : 
                                  (finalNum === 5) ? ['Green', 'Violet'] : 
                                  (finalNum % 2 === 0) ? ['Red'] : ['Green'];

                // Number match (9x)
                if (bet.betOn == finalNum) { 
                    isWin = true; 
                    mult = 9;
                }
                // Size match (2x)
                else if (bet.betOn === winSize) { 
                    isWin = true; 
                    mult = 2; 
                }
                // Color match
                else if (winColors.includes(bet.betOn)) {
                    isWin = true;
                    if (bet.betOn === 'Violet') {
                        mult = 4.5;
                    } else if (finalNum === 0 || finalNum === 5) {
                        mult = 1.5;
                    } else {
                        mult = 2;
                    }
                }

                // ✅ FIXED: Properly credit win amount
                if (isWin) {
                    const winAmount = bet.amount * mult;
                    
                    // Update user balance - ADD win amount
                    await User.updateOne(
                        { phoneNumber: phone }, 
                        { $inc: { balance: winAmount } }
                    );
                    
                    // Update bet status
                    await Bet.updateOne(
                        { _id: bet._id }, 
                        { $set: { status: 'won', winAmount, result: finalNum } }
                    );
                    
                    const updatedUser = await User.findOne({ phoneNumber: phone });
                    
                    return res.json({ 
                        status: 'won', 
                        winAmount, 
                        resultNumber: finalNum,
                        newBalance: updatedUser.balance
                    });
                } else {
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

            // Admin summary
            if (period && mode && !phone) {
                const pendingBets = await Bet.find({ 
                    period: period, 
                    mode: parseInt(mode) 
                }).lean();

                const colorSums = { Green: 0, Violet: 0, Red: 0 };
                const numberSums = {};
                
                for (let i = 0; i <= 9; i++) {
                    numberSums[i] = 0;
                }

                pendingBets.forEach(bet => {
                    if (['Green', 'Violet', 'Red'].includes(bet.betOn)) {
                        colorSums[bet.betOn] += bet.amount;
                    }
                    if (!isNaN(bet.betOn) && bet.betOn >= 0 && bet.betOn <= 9) {
                        numberSums[bet.betOn] += bet.amount;
                    }
                });

                const users = await User.find({}).lean();
                const userBetCounts = {};
                
                pendingBets.forEach(bet => {
                    userBetCounts[bet.phoneNumber] = (userBetCounts[bet.phoneNumber] || 0) + 1;
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
            console.error("❌ GET Error:", e);
            return res.status(500).json({ error: e.message });
        }
    }

    // ========================================
    // POST: PLACE BET
    // ========================================
    if (req.method === 'POST') {
        try {
            const body = req.body;

            if (body.phone && body.period && body.betOn && body.amount) {
                const { phone, period, mode, betOn, amount, betType, multiplier } = body;
                const betAmount = parseFloat(amount);

                const user = await User.findOne({ phoneNumber: phone });
                
                if (!user) {
                    return res.status(404).json({ 
                        success: false, 
                        message: 'User not found!' 
                    });
                }

                if (user.balance < betAmount) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Insufficient balance!' 
                    });
                }

                // Deduct balance
                await User.updateOne(
                    { phoneNumber: phone },
                    { $inc: { balance: -betAmount } }
                );

                // ✅ CHANGED: phone → phoneNumber in bet document
                await Bet.create({
                    phoneNumber: phone,  // ✅ Changed field name
                    period,
                    mode: parseInt(mode),
                    betOn: String(betOn),
                    amount: betAmount,
                    status: 'pending',
                    betType: betType || 'number',
                    multiplier: multiplier || 1,
                    timestamp: new Date()
                });

                const updatedUser = await User.findOne({ phoneNumber: phone });

                return res.status(200).json({ 
                    success: true, 
                    newBalance: updatedUser.balance,
                    message: 'Bet placed successfully'
                });
            }

        } catch (e) {
            console.error("❌ POST Error:", e);
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}
