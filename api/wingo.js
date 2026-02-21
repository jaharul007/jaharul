// ============================================================
//  api/wingo.js  — WinGo Game Backend (Vercel Serverless)
//  Handles: getBalance, placeBet, checkResult, generateResult,
//           getHistory, adminSummary, forceResult
//  Uses: User model (balance) + WingoBet model (bets/results)
// ============================================================

import mongoose from 'mongoose';
import User from '../models/User.js';

// ──────────────────────────────────────────────────────────────
// 1. DB CONNECTION
// ──────────────────────────────────────────────────────────────
const connectDB = async () => {
    if (mongoose.connections[0].readyState) return;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
    }
};

// ──────────────────────────────────────────────────────────────
// 2. WINGO BET SCHEMA
//    Ek document = ek user ka ek bet
// ──────────────────────────────────────────────────────────────
const WingoBetSchema = new mongoose.Schema({
    phone:      { type: String, required: true, index: true },
    period:     { type: String, required: true, index: true },
    mode:       { type: Number, required: true },   // 30 / 60 / 180 / 300
    betOn:      { type: String, required: true },   // 'Green','Red','Violet','Big','Small','0'-'9'
    amount:     { type: Number, required: true },
    status:     { type: String, default: 'pending' }, // pending / won / lost
    resultNumber: { type: Number, default: null },
    winAmount:  { type: Number, default: 0 },
    createdAt:  { type: Date, default: Date.now }
});

// ──────────────────────────────────────────────────────────────
// 3. WINGO RESULT SCHEMA
//    Ek document = ek period ka final result
// ──────────────────────────────────────────────────────────────
const WingoResultSchema = new mongoose.Schema({
    period:     { type: String, required: true, unique: true, index: true },
    mode:       { type: Number, required: true },
    number:     { type: Number, required: true },    // 0-9
    isForced:   { type: Boolean, default: false },   // Admin ne set kiya?
    processedAt: { type: Date, default: null },       // Jab timer zero hua
    createdAt:  { type: Date, default: Date.now }
});

// Models (reuse if already defined — Vercel hot reload fix)
const WingoBet    = mongoose.models.WingoBet    || mongoose.model('WingoBet',    WingoBetSchema);
const WingoResult = mongoose.models.WingoResult || mongoose.model('WingoResult', WingoResultSchema);

// ──────────────────────────────────────────────────────────────
// 4. WIN CALCULATION HELPER
//    Returns winAmount based on betOn and resultNumber
// ──────────────────────────────────────────────────────────────
function calcWin(betOn, resultNumber, betAmount) {
    const n = resultNumber;
    const isEven = n % 2 === 0;

    // Color logic: 0 = Red+Violet, 5 = Green+Violet
    const colorOfN = (n === 0 || n === 5) ? 'Violet' : (isEven ? 'Red' : 'Green');

    if (betOn === 'Green') {
        if (n === 5)              return betAmount * 1.5;  // 5 is Green+Violet → 1.5x
        if (!isEven && n !== 0)   return betAmount * 2;
        return 0;
    }
    if (betOn === 'Red') {
        if (n === 0)              return betAmount * 1.5;  // 0 is Red+Violet → 1.5x
        if (isEven && n !== 5)    return betAmount * 2;
        return 0;
    }
    if (betOn === 'Violet') {
        if (n === 0 || n === 5)   return betAmount * 4.5;
        return 0;
    }
    if (betOn === 'Big') {
        if (n >= 5)               return betAmount * 2;
        return 0;
    }
    if (betOn === 'Small') {
        if (n < 5)                return betAmount * 2;
        return 0;
    }
    // Number bet (0-9)
    if (parseInt(betOn) === n)    return betAmount * 9;
    return 0;
}

// ──────────────────────────────────────────────────────────────
// 5. PROCESS BETS for a completed period
//    Sab pending bets update karo + user balance update karo
// ──────────────────────────────────────────────────────────────
async function processBetsForPeriod(period, resultNumber) {
    const pendingBets = await WingoBet.find({ period, status: 'pending' });
    console.log(`📊 Processing ${pendingBets.length} bets for period ${period}, result: ${resultNumber}`);

    for (const bet of pendingBets) {
        const winAmt = calcWin(bet.betOn, resultNumber, bet.amount);
        const isWon  = winAmt > 0;

        bet.status       = isWon ? 'won' : 'lost';
        bet.resultNumber = resultNumber;
        bet.winAmount    = isWon ? winAmt : 0;
        await bet.save();

        if (isWon) {
            // User balance mein winnings add karo
            await User.findOneAndUpdate(
                { phoneNumber: bet.phone },
                { $inc: { balance: winAmt } }
            );
            console.log(`  🎉 ${bet.phone} WON ₹${winAmt} (betOn: ${bet.betOn})`);
        } else {
            console.log(`  😢 ${bet.phone} LOST (betOn: ${bet.betOn})`);
        }
    }
}

// ──────────────────────────────────────────────────────────────
// 6. RANDOM NUMBER GENERATOR
// ──────────────────────────────────────────────────────────────
function getRandomResult() {
    return Math.floor(Math.random() * 10); // 0-9
}

// ──────────────────────────────────────────────────────────────
// 7. MAIN HANDLER
// ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    await connectDB();

    // ══════════════════════════════════════════════
    //  GET REQUESTS
    // ══════════════════════════════════════════════
    if (req.method === 'GET') {
        const { action, phoneNumber, phone, period, mode, page } = req.query;

        // ── GET BALANCE ──────────────────────────────
        if (action === 'getBalance') {
            try {
                if (!phoneNumber) return res.status(400).json({ success: false, message: 'phoneNumber required' });
                const cleanPhone = decodeURIComponent(phoneNumber);
                const user = await User.findOne({ phoneNumber: cleanPhone });
                if (!user) return res.status(404).json({ success: false, message: 'User not found' });
                return res.status(200).json({ success: true, balance: user.balance, phoneNumber: user.phoneNumber });
            } catch (err) {
                console.error('getBalance error:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
        }

        // ── CHECK RESULT (User ke bet ka result) ─────
        // Game ke checkBetResult function call karta hai
        // Timer zero hone ke baad hi result DB mein hoga
        if (action === 'checkResult') {
            try {
                const cleanPhone = decodeURIComponent(phone || '');
                if (!cleanPhone || !period) {
                    return res.status(400).json({ success: false, message: 'phone and period required' });
                }

                // Pehle check karo period ka result aaya ki nahi
                const resultDoc = await WingoResult.findOne({ period });
                if (!resultDoc || resultDoc.processedAt === null) {
                    // Result abhi tak process nahi hua (timer zero nahi hua)
                    return res.status(200).json({ status: 'pending', message: 'Result not yet available' });
                }

                // Ab user ka specific bet dhundo
                const bet = await WingoBet.findOne({ phone: cleanPhone, period });
                if (!bet) {
                    return res.status(200).json({ status: 'no_bet', message: 'No bet found for this period' });
                }

                if (bet.status === 'pending') {
                    return res.status(200).json({ status: 'pending', message: 'Bet being processed' });
                }

                // Balance fetch karo
                const user = await User.findOne({ phoneNumber: cleanPhone });
                const newBalance = user ? user.balance : null;

                return res.status(200).json({
                    status: bet.status,         // 'won' or 'lost'
                    resultNumber: resultDoc.number,
                    winAmount: bet.winAmount,
                    newBalance
                });
            } catch (err) {
                console.error('checkResult error:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
        }

        // ── GET HISTORY (Game history) ───────────────
        if (action === 'getHistory') {
            try {
                const modeNum = parseInt(mode) || 60;
                const pageNum = parseInt(page)  || 1;
                const limit   = 10;
                const skip    = (pageNum - 1) * limit;

                const results = await WingoResult.find({ mode: modeNum, processedAt: { $ne: null } })
                    .sort({ period: -1 })
                    .skip(skip)
                    .limit(limit);

                const formatted = results.map(r => ({
                    p: r.period,
                    n: r.number
                }));

                return res.status(200).json({ success: true, results: formatted });
            } catch (err) {
                console.error('getHistory error:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
        }

        // ── GET MY BETS (User ki apni bet history) ───
        if (action === 'getMyBets') {
            try {
                const cleanPhone = decodeURIComponent(phone || '');
                if (!cleanPhone) return res.status(400).json({ success: false, message: 'phone required' });
                const modeNum = parseInt(mode) || 60;
                const bets = await WingoBet.find({ phone: cleanPhone, mode: modeNum })
                    .sort({ createdAt: -1 }).limit(20);
                return res.status(200).json({ success: true, bets });
            } catch (err) {
                console.error('getMyBets error:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
        }

                // ── ADMIN SUMMARY ────────────────────────────
        if (action === 'adminSummary') {
            try {
                // Current NEXT period ke bets dikhao (jo period display mein hai)
                const targetPeriod = period;
                if (!targetPeriod) return res.status(400).json({ success: false, message: 'period required' });

                const bets = await WingoBet.find({ period: targetPeriod });

                const colorSums   = { Green: 0, Violet: 0, Red: 0 };
                const numberSums  = {};
                const userBetMap  = {};

                for (let i = 0; i <= 9; i++) numberSums[i] = 0;

                bets.forEach(bet => {
                    if (['Green','Violet','Red'].includes(bet.betOn)) {
                        colorSums[bet.betOn] = (colorSums[bet.betOn] || 0) + bet.amount;
                    }
                    if (/^\d$/.test(bet.betOn)) {
                        numberSums[parseInt(bet.betOn)] += bet.amount;
                    }
                    if (!userBetMap[bet.phone]) userBetMap[bet.phone] = 0;
                    userBetMap[bet.phone] += bet.amount;
                });

                // All users list
                const allUsers = await User.find({}, 'phoneNumber balance').limit(50);
                const userList = allUsers.map(u => ({
                    phoneNumber: u.phoneNumber,
                    balance: u.balance,
                    activeBets: userBetMap[u.phoneNumber] ? `₹${userBetMap[u.phoneNumber]}` : '0'
                }));

                return res.status(200).json({ success: true, colorSums, numberSums, userList });
            } catch (err) {
                console.error('adminSummary error:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
        }
    }

    // ══════════════════════════════════════════════
    //  POST REQUESTS
    // ══════════════════════════════════════════════
    if (req.method === 'POST') {
        const { action, phone, phoneNumber, period, mode, betOn, amount, number, isAdmin } = req.body;

        // ── PLACE BET ────────────────────────────────
        // User bet lagata hai NEXT period mein
        if (action === 'placeBet') {
            try {
                const cleanPhone = decodeURIComponent(phone || '');
                if (!cleanPhone || !period || !betOn || !amount) {
                    return res.status(400).json({ success: false, message: 'phone, period, betOn, amount required' });
                }

                const betAmt = parseFloat(amount);
                if (isNaN(betAmt) || betAmt <= 0) {
                    return res.status(400).json({ success: false, message: 'Invalid bet amount' });
                }

                // User exist karo aur balance check karo
                const user = await User.findOne({ phoneNumber: cleanPhone });
                if (!user) return res.status(404).json({ success: false, message: 'User not found' });
                if (user.balance < betAmt) {
                    return res.status(400).json({ success: false, message: 'Insufficient balance' });
                }

                // Balance kaato
                user.balance = parseFloat((user.balance - betAmt).toFixed(2));
                await user.save();

                // Bet save karo
                const bet = new WingoBet({
                    phone: cleanPhone,
                    period,
                    mode: parseInt(mode) || 60,
                    betOn,
                    amount: betAmt,
                    status: 'pending'
                });
                await bet.save();

                console.log(`💰 Bet placed: ${cleanPhone} → ${betOn} ₹${betAmt} for period ${period}`);

                return res.status(200).json({
                    success: true,
                    message: 'Bet placed successfully',
                    newBalance: user.balance,
                    period,
                    betOn,
                    amount: betAmt
                });
            } catch (err) {
                console.error('placeBet error:', err);
                return res.status(500).json({ success: false, message: 'Bet failed' });
            }
        }

        // ── GENERATE / PROCESS RESULT ─────────────────
        // FIX 4: Ye tab call hoga jab timer ACTUALLY zero ho
        // (fetchFromDB period change hone par call karta hai)
        // Agar admin ne force kiya tha to wahi number use karo
        // Warna random generate karo
        if (action === 'generateResult') {
            try {
                const modeNum     = parseInt(mode) || 60;
                const targetPeriod = period;
                if (!targetPeriod) return res.status(400).json({ success: false, message: 'period required' });

                // Check karo: kya result pehle se exist karta hai?
                let resultDoc = await WingoResult.findOne({ period: targetPeriod });

                let finalNumber;

                if (resultDoc && resultDoc.processedAt !== null) {
                    // Already processed — skip
                    return res.status(200).json({
                        success: true,
                        message: 'Already processed',
                        number: resultDoc.number,
                        period: targetPeriod
                    });
                }

                if (resultDoc && resultDoc.isForced) {
                    // Admin ne force kiya tha — usi number ko use karo
                    finalNumber = resultDoc.number;
                    console.log(`🔧 Using admin forced result: ${finalNumber} for ${targetPeriod}`);
                } else {
                    // Auto random
                    finalNumber = getRandomResult();
                    console.log(`🎲 Auto result: ${finalNumber} for ${targetPeriod}`);

                    if (!resultDoc) {
                        resultDoc = new WingoResult({ period: targetPeriod, mode: modeNum, number: finalNumber });
                    } else {
                        resultDoc.number = finalNumber;
                    }
                }

                // Mark as processed (timer zero ho gaya)
                resultDoc.processedAt = new Date();
                await resultDoc.save();

                // Sab pending bets settle karo
                await processBetsForPeriod(targetPeriod, finalNumber);

                return res.status(200).json({
                    success: true,
                    message: `Result ${finalNumber} processed for ${targetPeriod}`,
                    number: finalNumber,
                    period: targetPeriod
                });
            } catch (err) {
                console.error('generateResult error:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
        }

        // ── ADMIN FORCE RESULT ───────────────────────
        // FIX 4: Admin NEXT period ka number pehle save karta hai
        // User ko result tab tak nahi milega jab tak timer zero na ho
        // fetchFromDB tab generateResult call karega jab period badlegi
        if (action === 'forceResult' || (action === 'generateResult' && isAdmin)) {
            // isAdmin === true matlab admin ne force kiya — sirf save karo, process mat karo abhi
            if (isAdmin && number !== undefined) {
                try {
                    const targetPeriod = period;
                    const forcedNum    = parseInt(number);
                    const modeNum      = parseInt(mode) || 60;

                    if (isNaN(forcedNum) || forcedNum < 0 || forcedNum > 9) {
                        return res.status(400).json({ success: false, message: 'Invalid number (0-9)' });
                    }

                    // Sirf save karo — processedAt null rakhenge
                    // Timer zero hone par generateResult dobara call hoga aur tab process hoga
                    await WingoResult.findOneAndUpdate(
                        { period: targetPeriod },
                        {
                            $set: {
                                period: targetPeriod,
                                mode: modeNum,
                                number: forcedNum,
                                isForced: true,
                                processedAt: null  // Timer zero hone ka wait
                            }
                        },
                        { upsert: true, new: true }
                    );

                    console.log(`🔧 Admin FORCED ${forcedNum} for period ${targetPeriod} — will process when timer hits zero`);

                    return res.status(200).json({
                        success: true,
                        message: `Forced result ${forcedNum} saved for period ${targetPeriod}. Will be revealed when timer hits zero.`,
                        period: targetPeriod,
                        number: forcedNum
                    });
                } catch (err) {
                    console.error('forceResult error:', err);
                    return res.status(500).json({ success: false, message: 'Force result failed' });
                }
            }
        }

        // ── UPDATE BALANCE (fallback) ─────────────────
        if (action === 'updateBalance') {
            try {
                const cleanPhone = decodeURIComponent(phoneNumber || '');
                const newBal = parseFloat(req.body.balance);
                if (!cleanPhone || isNaN(newBal)) {
                    return res.status(400).json({ success: false, message: 'phoneNumber and balance required' });
                }
                const user = await User.findOneAndUpdate(
                    { phoneNumber: cleanPhone },
                    { $set: { balance: newBal } },
                    { new: true }
                );
                if (!user) return res.status(404).json({ success: false, message: 'User not found' });
                return res.status(200).json({ success: true, balance: user.balance });
            } catch (err) {
                console.error('updateBalance error:', err);
                return res.status(500).json({ success: false, message: 'Update failed' });
            }
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}
