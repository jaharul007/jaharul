import mongoose from 'mongoose';
// '../' ka matlab hai api folder se bahar nikal kar models folder mein jaana
import User from '../models/User.js'; 

const connectDB = async () => {
    // Connection check
    if (mongoose.connections && mongoose.connections[0].readyState) {
        return;
    }
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected Successfully");
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
    }
};

export default async function handler(req, res) {
    // Database connect karein
    await connectDB();

    // --- 1. GET Request: Balance check karne ke liye ---
    if (req.method === 'GET') {
        const { action, phoneNumber } = req.query;

        if (action === 'getBalance') {
            try {
                if (!phoneNumber) return res.status(400).json({ success: false, message: 'Phone missing' });
                
                // URL encoding fix
                const cleanPhone = phoneNumber.replace(' ', '+'); 
                const user = await User.findOne({ phoneNumber: cleanPhone });

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

        // REGISTER LOGIC
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
                console.error("Reg Error:", err);
                return res.status(500).json({ success: false, message: 'Registration Failed' });
            }
        }

        // LOGIN LOGIC
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

    // Agar koi method match nahi hua
    return res.status(405).json({ message: 'Method not allowed' });
}
