import connectDB from '../lib/mongodb.js';
import User from '../models/User.js';

export default async function handler(req, res) {
    try {
        await connectDB();

        // 1. REGISTER NEW USER (POST)
        if (req.method === 'POST') {
            const { phone, password, inviteCode } = req.body;

            if (!phone || !password) {
                return res.status(400).json({ success: false, message: "Missing fields" });
            }

            const existingUser = await User.findOne({ phone });
            if (existingUser) {
                return res.status(400).json({ success: false, message: "User already exists!" });
            }

            const newUser = new User({ phone, password, inviteCode, balance: 0 });
            await newUser.save();

            return res.status(200).json({ success: true, message: "Registration Successful" });
        } 
        
        // 2. GET USER DATA / BALANCE (GET)
        else if (req.method === 'GET') {
            const { phone } = req.query;
            if (!phone) return res.status(400).json({ message: "Phone required" });

            const user = await User.findOne({ phone });
            if (!user) return res.status(404).json({ message: "User not found" });

            return res.status(200).json({
                success: true,
                phone: user.phone,
                balance: user.balance
            });
        }

        else {
            res.setHeader('Allow', ['GET', 'POST']);
            res.status(405).end(`Method ${req.method} Not Allowed`);
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
}
