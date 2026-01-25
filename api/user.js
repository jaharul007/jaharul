import connectDB from '../lib/mongodb.js';
import User from '../models/User.js';

export default async function handler(req, res) {
    try {
        await connectDB();

        // --- REGISTRATION LOGIC ---
        if (req.method === 'POST') {
            const { phone, password, inviteCode, balance } = req.body; // balance ko body se nikala

            if (!phone || !password) {
                return res.status(400).json({ success: false, message: "Phone and Password are required" });
            }

            const existingUser = await User.findOne({ phone });
            if (existingUser) {
                return res.status(400).json({ success: false, message: "User already exists!" });
            }

            const newUser = new User({ 
                phone, 
                password, 
                inviteCode: inviteCode || "", 
                // Agar frontend se balance (50) aaya toh wo save hoga, nahi toh 0
                balance: balance !== undefined ? balance : 0 
            });
            
            await newUser.save();
            return res.status(200).json({ success: true, message: "Registration Successful" });
        } 
        
        // --- REAL DATA FETCH LOGIC ---
        else if (req.method === 'GET') {
            const { phone, id } = req.query;
            const searchIdentifier = phone || id;

            if (!searchIdentifier) {
                return res.status(400).json({ success: false, message: "User Identifier (Phone/ID) required" });
            }

            const user = await User.findOne({ phone: searchIdentifier });

            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            return res.status(200).json({
                success: true,
                username: user.phone,
                balance: user.balance
            });
        }

        else {
            res.setHeader('Allow', ['GET', 'POST']);
            return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
        }

    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Database Connection Failed", 
            error: error.message 
        });
    }
}
