import mongoose from 'mongoose';
import User from './models/User.js'; // Extension .js zaroori hai

const connectDB = async () => {
    if (mongoose.connections[0].readyState) return;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
    }
};

export default async function handler(req, res) {
    await connectDB();

    // --- GET Request: Homepage balance ---
    if (req.method === 'GET') {
        const { action, phoneNumber } = req.query;
        if (action === 'getBalance') {
            try {
                if (!phoneNumber) return res.status(400).json({ success: false, message: 'Phone missing' });
                const cleanPhone = phoneNumber.replace(' ', '+'); 
                const user = await User.findOne({ phoneNumber: cleanPhone });
                if (!user) return res.status(404).json({ success: false, message: 'User not found' });
                return res.status(200).json({ success: true, balance: user.balance });
            } catch (err) {
                return res.status(500).json({ success: false, message: 'Server error' });
            }
        }
    }

    // --- POST Request: Register/Login ---
    if (req.method === 'POST') {
        const { action, phoneNumber, password, inviteCode, balance } = req.body;

        if (action === 'register') {
            try {
                const userExists = await User.findOne({ phoneNumber });
                if (userExists) return res.status(400).json({ success: false, message: 'Already registered' });

                const newUser = new User({
                    phoneNumber,
                    password, 
                    inviteCode: inviteCode || "",
                    balance: balance || 0
                });
                await newUser.save();
                return res.status(201).json({ success: true, message: 'Success', balance: newUser.balance });
            } catch (err) {
                return res.status(500).json({ success: false, message: 'Registration Failed' });
            }
        }
        else if (action === 'login') {
            try {
                const user = await User.findOne({ phoneNumber, password });
                if (!user) return res.status(401).json({ success: false, message: 'Invalid Credentials' });
                return res.status(200).json({ success: true, balance: user.balance });
            } catch (err) {
                return res.status(500).json({ success: false, message: 'Login Failed' });
            }
        }
    }
    return res.status(405).json({ message: 'Method not allowed' });
}
