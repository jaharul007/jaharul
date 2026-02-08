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
        console.log("✅ MongoDB Connected - Database: test");
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
    // GET REQUESTS
    // ========================================
    if (req.method === 'GET') {
        const { action, phone, period, mode, page = 1, limit = 10 } = req.query;

        try {
            // ===== ACTION: CHECK BET RESULT (Win/Loss) =====
            if (action === 'checkResult' && phone && period) {
                console.log(`\n🔍 Checking result for: ${phone}, Period: ${period}`);
                
                const result = await Result.findOne({ 
                    period: period, 
                    mode: parseInt(mode) 
                });

                if (!result) {
                    console.log("⏳ Result not generated yet");
                    return res.json({ status: 'pending' });
                }

                console.log(`✅ Result found: ${result.number}`);

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

                console.log(`💰 Processing bet: ${bet.betOn}, Amount: ₹${bet.amount}`);

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
                    console.log(`✅ NUMBER WIN! ${bet.betOn} = ${finalNum} → 9x`);
                }
                // Size match (2x)
                else if (bet.betOn === winSize) { 
                    isWin = true; 
                    mult = 2;
                    console.log(`✅ SIZE WIN! ${bet.betOn} = ${winSize} → 2x`);
                }
                // Color match
                else if (winColors.includes(bet.betOn)) {
                    isWin = true;
                    if (bet.betOn === 'Violet') {
                        mult = 4.5;
                        console.log(`✅ VIOLET WIN! → 4.5x`);
                    } else if (finalNum === 0 || finalNum === 5) {
                        mult = 1.5;
                        console.log(`✅ DUAL COLOR WIN! ${bet.betOn} → 1.5x`);
                    } else {
                        mult = 2;
                        console.log(`✅ COLOR WIN! ${bet.betOn} → 2x`);
                    }
                }

                // Process WIN
                if (isWin) {
                    const winAmount = bet.amount * mult;
                    console.log(`💵 Win Amount: ₹${winAmount} (${bet.amount} × ${mult})`);
                    
                    // ✅ ADD WIN AMOUNT TO USER BALANCE
                    const userUpdate = await User.updateOne(
                        { phoneNumber: phone }, 
                        { $inc: { balance: winAmount } }
                    );

                    console.log(`💳 Balance Update: ${userUpdate.modifiedCount > 0 ? '✅ SUCCESS' : '❌ FAILED'}`);
                    
                    // Update bet status
                    await Bet.updateOne(
                        { _id: bet._id }, 
                        { $set: { status: 'won', winAmount, result: finalNum } }
                    );

                    const updatedUser = await User.findOne({ phoneNumber: phone });
                    console.log(`📊 New Balance: ₹${updatedUser.balance}\n`);
                    
                    return res.json({ 
                        status: 'won', 
                        winAmount, 
                        resultNumber: finalNum,
                        newBalance: updatedUser.balance
                    });
                } else {
                    console.log(`❌ LOSS - Bet: ${bet.betOn} doesn't match\n`);
                    
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

            // ===== ACTION: GET HISTORY =====
            if (!action || action === 'getHistory') {
                if (mode === undefined) {
                    return res.status(400).json({ 
                        success: false, 
                        message: "Mode is required" 
                    });
                }

                const pageLimit = parseInt(limit);
                const skip = (parseInt(page) - 1) * pageLimit;

                const historyData = await Result
                    .find({ mode: parseInt(mode) })
                    .sort({ period: -1 })
                    .skip(skip)
                    .limit(pageLimit)
                    .lean();

                const total = await Result.countDocuments({ mode: parseInt(mode) });

                const formattedData = historyData.map(item => ({
                    p: item.period,
                    n: item.number,
                    c: item.color,
                    s: item.size,
                    t: item.timestamp
                }));

                return res.status(200).json({
                    success: true,
                    mode: parseInt(mode),
                    results: formattedData,
                    total: total,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / pageLimit)
                });
            }

            // ===== ACTION: ADMIN SUMMARY =====
            if (action === 'adminSummary' && period && mode) {
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
    // POST REQUESTS
    // ========================================
    if (req.method === 'POST') {
        try {
            const { action, phone, period, mode, betOn, amount, number, isAdmin } = req.body;

            // ===== ACTION: PLACE BET =====
            if (action === 'placeBet' && phone && period && betOn && amount) {
                const betAmount = parseFloat(amount);

                console.log(`\n📝 NEW BET`);
                console.log(`User: ${phone}`);
                console.log(`Period: ${period}`);
                console.log(`Bet On: ${betOn}`);
                console.log(`Amount: ₹${betAmount}`);

                const user = await User.findOne({ phoneNumber: phone });
                
                if (!user) {
                    console.log(`❌ User not found: ${phone}`);
                    return res.status(404).json({ 
                        success: false, 
                        message: 'User not found!' 
                    });
                }

                console.log(`Current Balance: ₹${user.balance}`);

                if (user.balance < betAmount) {
                    console.log(`❌ Insufficient balance`);
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Insufficient balance!' 
                    });
                }

                // ✅ DEDUCT BALANCE
                await User.updateOne(
                    { phoneNumber: phone },
                    { $inc: { balance: -betAmount } }
                );

                console.log(`✅ Deducted: ₹${betAmount}`);

                // Create bet
                await Bet.create({
                    phoneNumber: phone,
                    period,
                    mode: parseInt(mode),
                    betOn: String(betOn),
                    amount: betAmount,
                    status: 'pending',
                    timestamp: new Date()
                });

                const updatedUser = await User.findOne({ phoneNumber: phone });
                console.log(`New Balance: ₹${updatedUser.balance}\n`);

                return res.status(200).json({ 
                    success: true, 
                    newBalance: updatedUser.balance,
                    message: 'Bet placed successfully'
                });
            }

            // ===== ACTION: GENERATE/FORCE RESULT =====
            if (action === 'generateResult' || !action) {
                if (!period || mode === undefined) {
                    return res.status(400).json({ 
                        success: false, 
                        message: "Period or Mode missing" 
                    });
                }

                console.log(`\n🎲 RESULT REQUEST`);
                console.log(`Period: ${period}`);
                console.log(`Mode: ${mode}`);
                console.log(`Admin: ${isAdmin || false}`);
                console.log(`Number: ${number !== undefined ? number : 'Auto'}`);

                // Check existing result
                const existing = await Result.findOne({ 
                    period: period, 
                    mode: parseInt(mode) 
                });

                // ✅ ADMIN FORCE: Delete old result first
                if (existing && isAdmin === true && number !== undefined) {
                    console.log(`🔧 ADMIN FORCING - Deleting old result: ${existing.number}`);
                    await Result.deleteOne({ 
                        period: period, 
                        mode: parseInt(mode) 
                    });
                } else if (existing) {
                    console.log(`ℹ️ Result already exists: ${existing.number}`);
                    return res.json({ 
                        success: true, 
                        message: "Result already exists", 
                        number: existing.number,
                        data: existing
                    });
                }

                // Determine result number
                let finalNum;
                let isForced = false;

                if (isAdmin === true && number !== undefined && number !== null && number !== '') {
                    finalNum = parseInt(number);
                    isForced = true;
                    console.log(`🔧 ADMIN RESULT: ${finalNum}`);
                } else {
                    finalNum = Math.floor(Math.random() * 10);
                    console.log(`🎰 AUTO RESULT: ${finalNum}`);
                }

                // Validate
                if (finalNum < 0 || finalNum > 9 || isNaN(finalNum)) {
                    return res.status(400).json({ 
                        success: false, 
                        message: "Invalid number (0-9 only)" 
                    });
                }

                // Calculate color and size
                let color;
                if (finalNum === 0) {
                    color = ['red', 'violet'];
                } else if (finalNum === 5) {
                    color = ['green', 'violet'];
                } else if (finalNum % 2 === 0) {
                    color = ['red'];
                } else {
                    color = ['green'];
                }
                
                const size = (finalNum >= 5) ? 'Big' : 'Small';

                // Save result
                const resultDoc = {
                    period: period,
                    mode: parseInt(mode),
                    number: finalNum,
                    color: color,
                    size: size,
                    isForced: isForced,
                    timestamp: new Date()
                };

                const savedResult = await Result.create(resultDoc);

                console.log(`✅ Result Saved!`);
                console.log(`   Number: ${finalNum}`);
                console.log(`   Color: ${color.join(', ')}`);
                console.log(`   Size: ${size}`);
                console.log(`   Forced: ${isForced}\n`);

                return res.status(200).json({ 
                    success: true, 
                    message: isForced ? "Admin result saved" : "Auto result generated",
                    number: finalNum,
                    data: savedResult
                });
            }

        } catch (e) {
            console.error("❌ POST Error:", e);
            return res.status(500).json({ 
                success: false, 
                error: e.message 
            });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}
