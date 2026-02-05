import mongoose from 'mongoose';
import User from '../models/User';

const connectDB = async () => {
    if (mongoose.connections[0].readyState) return;
    try {
        await mongoose.connect(process.env.MONGO_URI);
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
    }
};

export default async function handler(req, res) {
    await connectDB();

    // --- 1. GET Request: Homepage par balance dikhane ke liye ---
    if (req.method === 'GET') {
        const { action, phoneNumber } = req.query;

        if (action === 'getBalance') {
            try {
                const user = await User.findOne({ phoneNumber });
                if (!user) {
                    return res.status(404).json({ success: false, message: 'User not found' });
                }
                return res.status(200).json({ success: true, balance: user.balance });
            } catch (err) {
                return res.status(500).json({ success: false, message: 'Server error' });
            }
        }
    }

    // --- 2. POST Request: Register aur Login ke liye ---
    if (req.method === 'POST') {
        const { action, phoneNumber, password, inviteCode, balance } = req.body;

        // --- REGISTER LOGIC ---
        if (action === 'register') {
            try {
                const userExists = await User.findOne({ phoneNumber });
                if (userExists) {
                    return res.status(400).json({ success: false, message: 'Phone number already registered' });
                }

                const newUser = new User({
                    phoneNumber,
                    password, 
                    inviteCode: inviteCode || "",
                    balance: balance || 0
                });

                await newUser.save();
                return res.status(201).json({ success: true, message: 'Registration Successful', balance: newUser.balance });
            } catch (err) {
                return res.status(500).json({ success: false, message: 'Registration Failed' });
            }
        }

        // --- LOGIN LOGIC ---
        else if (action === 'login') {
            try {
                const user = await User.findOne({ phoneNumber, password });
                if (!user) {
                    return res.status(401).json({ success: false, message: 'Invalid Phone or Password' });
                }
                return res.status(200).json({ success: true, message: 'Login Success', balance: user.balance });
            } catch (err) {
                return res.status(500).json({ success: false, message: 'Login Failed' });
            }
        }
    }

    // Default response if no conditions met
    return res.status(405).json({ message: 'Method not allowed' });
}
