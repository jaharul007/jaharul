const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// MongoDB URI Environment Variables से आएगी
const MONGO_URI = process.env.MONGO_URI;

// User Model: यहाँ balance फील्ड जोड़ दी गई है ताकि लॉगिन के समय एरर न आए
const UserSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 } // बैलेंस फील्ड ज़रूरी है
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

// Database Connection Function
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    try {
        await mongoose.connect(MONGO_URI);
    } catch (err) {
        console.error("DB Connection Error:", err);
    }
};

module.exports = async (req, res) => {
    // CORS Headers (ताकि ब्राउज़र ब्लॉक न करे)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method !== "POST") {
        return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    try {
        await connectDB();
        const { phoneNumber, password } = req.body;

        if (!phoneNumber || !password) {
            return res.status(400).json({ success: false, message: "Phone and Password are required" });
        }

        // 1. User को खोजें
        const user = await User.findOne({ phoneNumber });
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found! Please register first." });
        }

        // 2. Password Match करें
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid password! Please try again." });
        }

        // 3. Success Response (फ्रंटएंड के 'data.success' और 'data.message' के हिसाब से)
        return res.status(200).json({ 
            success: true, 
            message: "Login successful",
            phone: user.phoneNumber // फोन नंबर वापस भेजना ज़रूरी है
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
