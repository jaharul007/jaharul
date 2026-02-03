const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); 

// MongoDB Connection
const MONGODB_URI = 'mongodb://localhost:27017/bdg_game';

mongoose.connect(MONGODB_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 100 },
    inviteCode: { type: String, required: true },
    registeredAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Registration Route
app.post('/register', async (req, res) => {
    try {
        const { phone, password, inviteCode } = req.body;
        if (inviteCode !== '1234') {
            return res.status(400).json({ message: 'Invalid invite code' });
        }
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ message: 'Phone number already registered' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ phone, password: hashedPassword, inviteCode, balance: 100 });
        await newUser.save();
        res.status(201).json({ message: 'Registration successful', user: { phone: newUser.phone, balance: newUser.balance } });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
