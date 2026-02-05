const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Database URI from Vercel Environment Variables
const MONGO_URI = process.env.MONGO_URI;

// User Model (Schema) - यहाँ balance और phone फील्ड्स अपडेट की गई हैं
const UserSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    inviteCode: { type: String, default: null },
    // बैलेंस फील्ड जोड़ दी गई है ताकि पैसा स्टोर हो सके
    balance: { type: Number, default: 0 }, 
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

// MongoDB Connection Function
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    if (!MONGO_URI) throw new Error("MONGO_URI is undefined. Check Vercel Settings.");
    try {
        await mongoose.connect(MONGO_URI);
    } catch (err) {
        console.error("MongoDB Connection Error:", err);
    }
};

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

    try {
        await connectDB();
        const { phoneNumber, password, inviteCode } = req.body;

        if (!phoneNumber || !password) {
            return res.status(400).json({ success: false, message: "Details are missing" });
        }

        const userExists = await User.findOne({ phoneNumber });
        if (userExists) {
            return res.status(400).json({ success: false, message: "Phone number already registered" });
        }

        // --- बोनस लॉजिक (Invite Code 1234) ---
        let signupBonus = 0;
        if (inviteCode === "1234") {
            signupBonus = 100;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({ 
            phoneNumber, 
            password: hashedPassword, 
            inviteCode,
            balance: signupBonus // यहाँ ₹100 सेव हो रहा है
        });

        await newUser.save();

        // सफलता का मैसेज और फोन नंबर वापस भेजना ताकि फ्रंटएंड URL में यूज़ कर सके
        return res.status(200).json({ 
            success: true, 
            message: signupBonus > 0 ? "Registration successful with ₹100 bonus!" : "Registration successful",
            phone: phoneNumber // यह बहुत जरूरी है फ्रंटएंड के लिए
        });

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
