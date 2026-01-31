// ============================================
// GAME BACKEND API (Wingo + Aviator) - RAILWAY READY
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
// MONGOOSE SCHEMAS (Keep these for common access)
// ============================================
// (User, GameResult, Bet, Aviator schemas yahan rahenge...)
// [Mene niche code short kiya hai space ke liye, aapka purana schema yahan rahega]

// ============================================
// IMPORTING YOUR 11 FILES (FILES ALAG RAHENGI)
// ============================================

// Wingo & User Routes
app.use('/api/login', require('./api/login.js'));
app.use('/api/register', require('./api/register.js'));
app.use('/api/balance', require('./api/balance.js'));
app.use('/api/bet', require('./api/bet.js'));
app.use('/api/history', require('./api/history.js'));
app.use('/api/myhistory', require('./api/myhistory.js'));
app.use('/api/user', require('./api/user.js'));

// Results & Admin Routes
app.use('/api/process-results', require('./api/process-results.js'));
app.use('/api/save-result', require('./api/save-result.js'));
app.use('/api/add-result', require('./api/add-result.js'));

// Aviator Special Routes
app.use('/api/aviator/bet', require('./api/aviator/bet.js'));
app.use('/api/aviator/cashout', require('./api/aviator/cashout.js'));
app.use('/api/aviator/next-round', require('./api/aviator/next-round.js'));
app.use('/api/admin/set-crash', require('./api/admin/set-crash.js'));

// ============================================
// HELPERS & CRON (AUTO GENERATORS)
// ============================================
function getColor(num) {
    if (num === 0 || num === 5) return 'Violet';
    if (num % 2 === 0) return 'Red';
    return 'Green';
}
function getSize(num) { return num >= 5 ? 'Big' : 'Small'; }

setInterval(async () => {
    // Game Auto-generation logic here...
}, 10000);

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server Running on Port ${PORT}`);
    console.log(`🚀 Ready for Railway!`);
});
