const mongoose = require('mongoose');
const User = require('../models/User');

// MongoDB Connection Logic
const connectDB = async () => {
    if (mongoose.connections[0].readyState) return;
    await mongoose.connect(process.env.MONGODB_URI); // Vercel Dashboard mein MONGODB_URI set karein
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        await connectDB();
        const { phone, password, inviteCode } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists!" });
        }

        // Bonus logic
        const initialBalance = (inviteCode === "1234") ? 50 : 0;

        // Save to MongoDB
        const newUser = new User({
            phone,
            password,
            inviteCode,
            balance: initialBalance,
            createdAt: new Date()
        });

        await newUser.save();

        return res.status(200).json({ 
            success: true, 
            message: "Registration Successful!",
            initialBalance 
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}
