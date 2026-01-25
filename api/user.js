import connectDB from '../lib/mongodb.js';
import User from '../models/User.js';

export default async function handler(req, res) {
    try {
        await connectDB();

        // --- REGISTRATION LOGIC (No Change) ---
        if (req.method === 'POST') {
            const { phone, password, inviteCode } = req.body;

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
        
        // --- REAL DATA FETCH LOGIC (Updated for index.html) ---
        else if (req.method === 'GET') {
            const { phone, id } = req.query; // 'id' bhi handle kar liya jo hum index.html se bhej rahe hain
            
            // Hum dono mein se kuch bhi milne par user dhoondhenge
            const searchIdentifier = phone || id;

            if (!searchIdentifier) {
                return res.status(400).json({ success: false, message: "User Identifier (Phone/ID) required" });
            }

            // Database mein phone number se user dhoondhna
            const user = await User.findOne({ phone: searchIdentifier });

            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            // Ye data seedha aapke index.html ke 'userName' aur 'userBalance' mein jayega
            return res.status(200).json({
                success: true,
                username: user.phone, // Phone ko hi username ki tarah dikhayenge
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
