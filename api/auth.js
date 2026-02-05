import mongoose from 'mongoose';
import User from '../models/User';

const connectDB = async () => {
    if (mongoose.connections[0].readyState) return;
    await mongoose.connect(process.env.MONGO_URI);
};

export default async function handler(req, res) {
    await connectDB();

    // --- GET Request: Balance check karne ke liye ---
    if (req.method === 'GET') {
        const { action, phoneNumber } = req.query;
        if (action === 'getBalance') {
            try {
                const user = await User.findOne({ phoneNumber });
                if (user) {
                    return res.status(200).json({ success: true, balance: user.balance });
                }
                return res.status(404).json({ success: false, message: 'User not found' });
            } catch (err) {
                return res.status(500).json({ success: false, message: 'Server error' });
            }
        }
    }

    // --- POST Request: Register aur Login ke liye (Purana wala logic) ---
    if (req.method === 'POST') {
        const { action, phoneNumber, password, inviteCode, balance } = req.body;
        
        if (action === 'register') {
            // ... (Aapka register wala code) ...
            // Yaad se balance: newUser.balance bhi return karein
        } 
        else if (action === 'login') {
            // ... (Aapka login wala code) ...
        }
    }
}
