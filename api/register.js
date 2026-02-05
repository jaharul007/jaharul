import mongoose from 'mongoose';
import User from '../models/User';

// MongoDB Connection Logic
const connectDB = async () => {
    if (mongoose.connections[0].readyState) return;
    await mongoose.connect(process.env.MONGO_URI);
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        await connectDB();
        const { phoneNumber, password, inviteCode } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ phoneNumber });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Phone number already registered' });
        }

        // Logic: Backend par balance set karna (Safe Method)
        let initialBalance = 0;
        if (inviteCode === "1234") {
            initialBalance = 100;
        }

        const newUser = new User({
            phoneNumber,
            password, // Note: Real app mein password ko 'bcrypt' se hash karna chahiye
            inviteCode,
            balance: initialBalance
        });

        await newUser.save();

        return res.status(201).json({ 
            success: true, 
            message: 'Registration successful',
            balance: initialBalance 
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
