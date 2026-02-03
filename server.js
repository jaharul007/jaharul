const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // यह आपकी HTML फाइलों को सर्व करेगा

// MongoDB Connection (Vercel Environment Variables से)
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB Atlas connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 100 },
    inviteCode: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Registration Route
app.post('/api/register', async (req, res) => {
    try {
        const { phone, password, inviteCode } = req.body;
        if (inviteCode !== '1234') return res.status(400).json({ message: 'Invalid invite code' });

        const existingUser = await User.findOne({ phone });
        if (existingUser) return res.status(400).json({ message: 'Phone number already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ phone, password: hashedPassword, inviteCode, balance: 100 });
        await newUser.save();

        res.status(201).json({ message: 'Registration successful', balance: 100 });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Vercel के लिए ज़रुरी: एक्सपोर्ट करना
module.exports = app;
