// ============================================
// WINGO GAME - BACKEND API (Node.js + MongoDB)
// ============================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Static files ke liye

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

// User Schema
const userSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true, index: true },
    balance: { type: Number, default: 0 },
    name: String,
    email: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Game Result Schema (History)
const gameResultSchema = new mongoose.Schema({
    period: { type: String, required: true, unique: true, index: true },
    mode: { type: Number, required: true, index: true }, // 30, 60, 180, 300
    number: { type: Number, required: true, min: 0, max: 9 },
    color: { type: String, enum: ['Green', 'Red', 'Violet'] },
    size: { type: String, enum: ['Big', 'Small'] },
    timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

// Bet Schema
const betSchema = new mongoose.Schema({
    phone: { type: String, required: true, index: true },
    period: { type: String, required: true, index: true },
    mode: { type: Number, required: true },
    betOn: { type: String, required: true }, // Green, Red, Violet, 0-9, Big, Small
    betType: { type: String, enum: ['color', 'number', 'size', 'random'] },
    amount: { type: Number, required: true },
    multiplier: { type: Number, default: 1 },
    status: { type: String, enum: ['pending', 'won', 'lost'], default: 'pending', index: true },
    resultNumber: Number,
    winAmount: Number,
    timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

// Create compound index for efficient queries
betSchema.index({ phone: 1, period: 1 });
betSchema.index({ period: 1, mode: 1 });
gameResultSchema.index({ mode: 1, timestamp: -1 });

const User = mongoose.model('User', userSchema);
const GameResult = mongoose.model('GameResult', gameResultSchema);
const Bet = mongoose.model('Bet', betSchema);

// ============================================
// HELPER FUNCTIONS
// ============================================

// Generate random number (0-9) for game result
function generateRandomNumber() {
    return Math.floor(Math.random() * 10);
}

// Determine color based on number
function getColor(num) {
    if (num === 0 || num === 5) return 'Violet';
    if (num % 2 === 0) return 'Red';
    return 'Green';
}

// Determine size based on number
function getSize(num) {
    return num >= 5 ? 'Big' : 'Small';
}

// Calculate win amount based on bet type
function calculateWinAmount(bet, resultNumber) {
    const resultColor = getColor(resultNumber);
    const resultSize = getSize(resultNumber);
    
    // Number bet (0-9)
    if (bet.betType === 'number' && parseInt(bet.betOn) === resultNumber) {
        return bet.amount * 9;
    }
    
    // Color bet
    if (bet.betType === 'color') {
        if (bet.betOn === resultColor) {
            // Violet has higher multiplier
            return bet.amount * (resultColor === 'Violet' ? 4.5 : 2);
        }
    }
    
    // Size bet (Big/Small)
    if (bet.betType === 'size' && bet.betOn === resultSize) {
        return bet.amount * 2;
    }
    
    // Random bet - always wins something
    if (bet.betType === 'random') {
        return bet.amount * 1.5;
    }
    
    return 0; // Lost
}

// Check if bet won
function checkBetWin(bet, resultNumber) {
    const resultColor = getColor(resultNumber);
    const resultSize = getSize(resultNumber);
    
    if (bet.betType === 'number') {
        return parseInt(bet.betOn) === resultNumber;
    }
    
    if (bet.betType === 'color') {
        return bet.betOn === resultColor;
    }
    
    if (bet.betType === 'size') {
        return bet.betOn === resultSize;
    }
    
    if (bet.betType === 'random') {
        return true; // Random always wins
    }
    
    return false;
}

// ============================================
// API ENDPOINTS
// ============================================

// 1. Get/Create User Balance
app.get('/api/user', async (req, res) => {
    try {
        const { phone } = req.query;
        
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone number required' });
        }
        
        let user = await User.findOne({ phone });
        
        // Create user if doesn't exist
        if (!user) {
            user = new User({ 
                phone, 
                balance: 1000 // Starting balance
            });
            await user.save();
            console.log('✅ New user created:', phone);
        }
        
        res.json({ 
            success: true, 
            balance: user.balance,
            phone: user.phone 
        });
        
    } catch (err) {
        console.error('❌ User API Error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 2. Get Game History (for Game History tab)
app.get('/api/history', async (req, res) => {
    try {
        const { mode = 60, page = 1, limit = 10 } = req.query;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const results = await GameResult.find({ mode: parseInt(mode) })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('period number color size timestamp')
            .lean();
        
        // Format response for frontend
        const formattedResults = results.map(r => ({
            p: r.period,
            n: r.number,
            color: r.color,
            size: r.size,
            timestamp: r.timestamp
        }));
        
        console.log(`📊 Fetched ${formattedResults.length} results for mode ${mode}`);
        
        res.json(formattedResults);
        
    } catch (err) {
        console.error('❌ History API Error:', err);
        res.status(500).json([]);
    }
});

// 3. Get User's Bet History (for My History tab)
app.get('/api/myhistory', async (req, res) => {
    try {
        const { phone, mode = 60, limit = 50 } = req.query;
        
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone required' });
        }
        
        const bets = await Bet.find({ 
            phone, 
            mode: parseInt(mode) 
        })
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .lean();
        
        console.log(`📋 Fetched ${bets.length} bets for ${phone}`);
        
        res.json({ 
            success: true, 
            bets: bets 
        });
        
    } catch (err) {
        console.error('❌ My History API Error:', err);
        res.status(500).json({ success: false, bets: [] });
    }
});

// 4. Place Bet
app.post('/api/bet', async (req, res) => {
    try {
        const { phone, period, mode, betOn, amount, betType, multiplier } = req.body;
        
        // Validation
        if (!phone || !period || !betOn || !amount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }
        
        // Get user
        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Check balance
        if (user.balance < amount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Insufficient balance' 
            });
        }
        
        // Check if bet already placed for this period
        const existingBet = await Bet.findOne({ phone, period, betOn });
        if (existingBet) {
            return res.status(400).json({ 
                success: false, 
                message: 'Bet already placed for this period' 
            });
        }
        
        // Deduct balance
        user.balance -= amount;
        await user.save();
        
        // Create bet
        const bet = new Bet({
            phone,
            period,
            mode: parseInt(mode),
            betOn,
            betType: betType || 'color',
            amount,
            multiplier: multiplier || 1,
            status: 'pending'
        });
        
        await bet.save();
        
        console.log(`✅ Bet placed: ${phone} - ${betOn} - ₹${amount}`);
        
        res.json({ 
            success: true, 
            message: 'Bet placed successfully',
            newBalance: user.balance,
            betId: bet._id
        });
        
    } catch (err) {
        console.error('❌ Bet API Error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// 5. Process Results (Called automatically or manually)
app.post('/api/process-results', async (req, res) => {
    try {
        const { period, mode } = req.body;
        
        if (!period || !mode) {
            return res.status(400).json({ 
                success: false, 
                message: 'Period and mode required' 
            });
        }
        
        // Check if result already exists
        let result = await GameResult.findOne({ period });
        
        if (!result) {
            // Generate new result
            const randomNumber = generateRandomNumber();
            
            result = new GameResult({
                period,
                mode: parseInt(mode),
                number: randomNumber,
                color: getColor(randomNumber),
                size: getSize(randomNumber)
            });
            
            await result.save();
            console.log(`🎲 New result generated: Period ${period} = ${randomNumber}`);
        }
        
        // Process all pending bets for this period
        const pendingBets = await Bet.find({ period, status: 'pending' });
        
        console.log(`⚙️ Processing ${pendingBets.length} bets for period ${period}`);
        
        for (const bet of pendingBets) {
            const isWin = checkBetWin(bet, result.number);
            
            bet.status = isWin ? 'won' : 'lost';
            bet.resultNumber = result.number;
            
            if (isWin) {
                const winAmount = calculateWinAmount(bet, result.number);
                bet.winAmount = winAmount;
                
                // Add winning to user balance
                await User.findOneAndUpdate(
                    { phone: bet.phone },
                    { $inc: { balance: winAmount } }
                );
                
                console.log(`✅ Win: ${bet.phone} won ₹${winAmount}`);
            } else {
                bet.winAmount = 0;
                console.log(`❌ Loss: ${bet.phone} lost ₹${bet.amount}`);
            }
            
            await bet.save();
        }
        
        res.json({ 
            success: true, 
            message: `Processed ${pendingBets.length} bets`,
            result: {
                period: result.period,
                number: result.number,
                color: result.color,
                size: result.size
            }
        });
        
    } catch (err) {
        console.error('❌ Process Results Error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// 6. Auto-generate results (CRON job alternative)
// This should run every mode interval (30s, 1m, 3m, 5m)
async function autoGenerateResults() {
    const modes = [30, 60, 180, 300];
    
    for (const mode of modes) {
        try {
            const now = new Date();
            const total = (now.getHours()*3600) + (now.getMinutes()*60) + now.getSeconds();
            const dateStr = now.getFullYear().toString() + 
                          (now.getMonth()+1).toString().padStart(2,'0') + 
                          now.getDate().toString().padStart(2,'0');
            const currentPeriod = dateStr + Math.floor(total/mode).toString().padStart(4, '0');
            
            // Check if result exists
            const existingResult = await GameResult.findOne({ period: currentPeriod });
            
            if (!existingResult) {
                const randomNumber = generateRandomNumber();
                
                const result = new GameResult({
                    period: currentPeriod,
                    mode: mode,
                    number: randomNumber,
                    color: getColor(randomNumber),
                    size: getSize(randomNumber)
                });
                
                await result.save();
                console.log(`🎲 Auto-generated: ${currentPeriod} = ${randomNumber}`);
                
                // Process bets
                setTimeout(async () => {
                    await fetch('http://localhost:3000/api/process-results', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ period: currentPeriod, mode })
                    });
                }, 2000);
            }
        } catch (err) {
            console.error(`❌ Auto-generate error for mode ${mode}:`, err);
        }
    }
}

// Run auto-generation every 10 seconds
setInterval(autoGenerateResults, 10000);

// 7. Admin: Add balance (for testing)
app.post('/api/admin/add-balance', async (req, res) => {
    try {
        const { phone, amount } = req.body;
        
        const user = await User.findOneAndUpdate(
            { phone },
            { $inc: { balance: amount } },
            { new: true, upsert: true }
        );
        
        console.log(`💰 Added ₹${amount} to ${phone}`);
        
        res.json({ 
            success: true, 
            newBalance: user.balance 
        });
        
    } catch (err) {
        console.error('❌ Add Balance Error:', err);
        res.status(500).json({ success: false });
    }
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   🎮 WINGO GAME API SERVER RUNNING   ║
║   📡 Port: ${PORT}                        ║
║   🗄️  MongoDB: Connected               ║
║   ✅ All Systems Ready                 ║
╚════════════════════════════════════════╝
    `);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});