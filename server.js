// ============================================
// GAME BACKEND API (Wingo + Aviator)
// ============================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); 

// ============================================
// MONGODB CONNECTION
// ============================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wingo_game';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// ============================================
// MONGOOSE SCHEMAS
// ============================================

// --- COMMON USER SCHEMA ---
const userSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true, index: true },
    balance: { type: Number, default: 0 },
    name: String,
    email: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// --- WINGO SCHEMAS ---
const gameResultSchema = new mongoose.Schema({
    period: { type: String, required: true, unique: true, index: true },
    mode: { type: Number, required: true, index: true },
    number: { type: Number, required: true, min: 0, max: 9 },
    color: { type: String, enum: ['Green', 'Red', 'Violet'] },
    size: { type: String, enum: ['Big', 'Small'] },
    timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

const betSchema = new mongoose.Schema({
    phone: { type: String, required: true, index: true },
    period: { type: String, required: true, index: true },
    mode: { type: Number, required: true },
    betOn: { type: String, required: true },
    betType: { type: String, enum: ['color', 'number', 'size', 'random'] },
    amount: { type: Number, required: true },
    multiplier: { type: Number, default: 1 },
    status: { type: String, enum: ['pending', 'won', 'lost'], default: 'pending', index: true },
    resultNumber: Number,
    winAmount: Number,
    timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

// --- AVIATOR SCHEMAS (NEW) ---
const aviatorRoundSchema = new mongoose.Schema({
    roundId: { type: Number, required: true, unique: true },
    crashPoint: { type: Number, required: true },
    status: { type: String, enum: ['playing', 'crashed'], default: 'playing' },
    startTime: { type: Date, default: Date.now }
});

const aviatorBetSchema = new mongoose.Schema({
    phone: { type: String, required: true, index: true },
    roundId: { type: Number, required: true },
    amount: { type: Number, required: true },
    cashoutMultiplier: { type: Number }, // If cashed out
    winAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'won', 'lost'], default: 'pending' },
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const GameResult = mongoose.model('GameResult', gameResultSchema);
const Bet = mongoose.model('Bet', betSchema);
const AviatorRound = mongoose.model('AviatorRound', aviatorRoundSchema);
const AviatorBet = mongoose.model('AviatorBet', aviatorBetSchema);

// ============================================
// AVIATOR GLOBAL STATE & ADMIN LOGIC
// ============================================
let nextCrashPoint = null; // Admin can set this

// ============================================
// API ENDPOINTS
// ============================================

// 1. Get/Create User Balance (Same as Wingo)
app.get('/api/user', async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone) return res.status(400).json({ success: false, message: 'Phone required' });
        
        let user = await User.findOne({ phone });
        if (!user) {
            user = new User({ phone, balance: 1000 });
            await user.save();
        }
        res.json({ success: true, balance: user.balance, phone: user.phone });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 2. AVIATOR: Place Bet
app.post('/api/aviator/bet', async (req, res) => {
    try {
        const { phone, amount, roundId } = req.body;
        const user = await User.findOne({ phone });

        if (!user || user.balance < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }

        user.balance -= amount;
        await user.save();

        const newBet = new AviatorBet({
            phone,
            roundId,
            amount,
            status: 'pending'
        });
        await newBet.save();

        res.json({ success: true, newBalance: user.balance, betId: newBet._id });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Bet error' });
    }
});

// 3. AVIATOR: Cashout
app.post('/api/aviator/cashout', async (req, res) => {
    try {
        const { phone, betId, multiplier } = req.body;
        const bet = await AviatorBet.findById(betId);

        if (!bet || bet.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Invalid bet' });
        }

        const winAmount = bet.amount * multiplier;
        bet.status = 'won';
        bet.cashoutMultiplier = multiplier;
        bet.winAmount = winAmount;
        await bet.save();

        const user = await User.findOneAndUpdate(
            { phone },
            { $inc: { balance: winAmount } },
            { new: true }
        );

        res.json({ success: true, winAmount, newBalance: user.balance });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// 4. AVIATOR ADMIN: Set Next Crash Point
app.post('/api/admin/set-aviator-crash', (req, res) => {
    const { point } = req.body;
    nextCrashPoint = parseFloat(point);
    console.log(`🎯 Admin set next Aviator crash to: ${nextCrashPoint}x`);
    res.json({ success: true, nextCrashPoint });
});

// ============================================
// WINGO LOGIC (Keeping your original code)
// ============================================

// Determine color/size
function getColor(num) {
    if (num === 0 || num === 5) return 'Violet';
    if (num % 2 === 0) return 'Red';
    return 'Green';
}
function getSize(num) { return num >= 5 ? 'Big' : 'Small'; }

// Wingo API Endpoints (as per your code)
app.get('/api/history', async (req, res) => {
    try {
        const { mode = 60 } = req.query;
        const results = await GameResult.find({ mode: parseInt(mode) }).sort({ timestamp: -1 }).limit(10).lean();
        res.json(results.map(r => ({ p: r.period, n: r.number, color: r.color, size: r.size })));
    } catch (err) { res.status(500).json([]); }
});

app.post('/api/bet', async (req, res) => {
    try {
        const { phone, period, mode, betOn, amount, betType } = req.body;
        const user = await User.findOne({ phone });
        if (!user || user.balance < amount) return res.status(400).json({ success: false, message: 'Error' });

        user.balance -= amount;
        await user.save();

        const bet = new Bet({ phone, period, mode, betOn, betType, amount });
        await bet.save();
        res.json({ success: true, newBalance: user.balance });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ============================================
// AUTO GENERATORS (CRON)
// ============================================
setInterval(async () => {
    // Wingo Auto-generation call logic here...
    // Aviator Auto-generation call logic here...
}, 10000);

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server Running: Wingo + Aviator on Port ${PORT}`);
});
