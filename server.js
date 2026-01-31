const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config(); // Iske liye .env file zaroori hai

const app = express();
app.use(cors());
app.use(express.json());

// 1. Static files (index.html ko serve karne ke liye)
app.use(express.static(path.join(__dirname, '/')));

// 2. MongoDB Connection
// Note: Vercel par "MONGODB_URI" name ka environment variable set karein
const mongoURI = process.env.MONGODB_URI || "APNA_MONGODB_CONNECTION_STRING_YAHAN_DALO";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ MongoDB Connected Successfully!"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// 3. Database Schemas
const ResultSchema = new mongoose.Schema({
    period: String,
    number: Number,
    mode: Number,
    timestamp: { type: Date, default: Date.now }
});
const Result = mongoose.model('Result', ResultSchema);

const UserSchema = new mongoose.Schema({
    phone: String,
    balance: { type: Number, default: 0 }
});
const User = mongoose.model('User', UserSchema);

// 4. APIs

// API: User balance fetch karna
app.get('/api/user', async (req, res) => {
    try {
        const user = await User.findOne({ phone: req.query.phone });
        res.json({ success: true, balance: user ? user.balance : 0 });
    } catch (e) { res.json({ success: false }); }
});

// API: Result save karna (Timer 2 sec par aata hai tab)
app.post('/api/save-result', async (req, res) => {
    const { period, mode } = req.body;
    try {
        const exists = await Result.findOne({ period, mode });
        if (!exists) {
            const randomNumber = Math.floor(Math.random() * 10);
            const newRes = new Result({ period, mode, number: randomNumber });
            await newRes.save();
            return res.json({ success: true, result: newRes });
        }
        res.json({ success: true, message: "Already exists" });
    } catch (e) { res.json({ success: false }); }
});

// API: History dikhana
app.get('/api/history', async (req, res) => {
    try {
        const history = await Result.find({ mode: req.query.mode })
                                   .sort({ period: -1 })
                                   .limit(50);
        res.json({ success: true, results: history });
    } catch (e) { res.json({ success: false }); }
});

// 5. Default Route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
