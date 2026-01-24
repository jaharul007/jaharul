import connectDB from '../lib/mongodb.js';
import User from '../models/User.js';

export default async function handler(req, res) {
    // Vercel serverless environment mein connection ko await karna zaroori hai
    try {
        await connectDB();

        if (req.method === 'POST') {
            const { phone, password, inviteCode } = req.body;

            // Basic validation check
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
                balance: 0 
            });
            
            await newUser.save();
            return res.status(200).json({ success: true, message: "Registration Successful" });
        } 
        
        else if (req.method === 'GET') {
            const { phone } = req.query;
            if (!phone) return res.status(400).json({ success: false, message: "Phone required" });

            const user = await User.findOne({ phone });
            if (!user) return res.status(404).json({ success: false, message: "User not found" });

            return res.status(200).json({
                success: true,
                phone: user.phone,
                balance: user.balance
            });
        }

        else {
            res.setHeader('Allow', ['GET', 'POST']);
            return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
        }

    } catch (error) {
        console.error("API Error:", error);
        // Error message ko JSON mein bhejna zaroori hai taaki frontend use handle kar sake
        return res.status(500).json({ 
            success: false, 
            message: "Database Connection Failed", 
            error: error.message 
        });
    }
}
