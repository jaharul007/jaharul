const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Database URI
const MONGO_URI = process.env.MONGO_URI;

// Schema: यहाँ हमने 'phone' इस्तेमाल किया है ताकि user.js के साथ मैच हो सके
const UserSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    inviteCode: { type: String, default: null },
    balance: { type: Number, default: 0 }, 
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    try {
        // यहाँ पक्का करें कि MONGO_URI के अंत में /wingo_game (या आपका DB नाम) है
        await mongoose.connect(MONGO_URI);
    } catch (err) {
        console.error("MongoDB Connection Error:", err);
    }
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

    try {
        await connectDB();
        const { phoneNumber, password, inviteCode } = req.body; // फ्रंटएंड से phoneNumber आ रहा है

        if (!phoneNumber || !password) {
            return res.status(400).json({ success: false, message: "Details are missing" });
        }

        // जाँच करें कि क्या यूजर पहले से है
        const userExists = await User.findOne({ phone: phoneNumber });
        if (userExists) {
            return res.status(400).json({ success: false, message: "Phone number already registered" });
        }

        // बोनस लॉजिक: 1234 कोड पर ₹100
        let signupBonus = (inviteCode === "1234") ? 100 : 0;

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({ 
            phone: phoneNumber, // हम DB में 'phone' नाम से सेव कर रहे हैं
            password: hashedPassword, 
            inviteCode,
            balance: signupBonus 
        });

        await newUser.save();

        return res.status(200).json({ 
            success: true, 
            message: signupBonus > 0 ? "Registered with ₹100 bonus!" : "Registered!",
            phone: phoneNumber 
        });

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
