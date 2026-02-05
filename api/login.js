const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// MongoDB URI aapke Vercel Environment Variables mein honi chahiye
const MONGO_URI = process.env.MONGO_URI;

// User Model (Wahi schema jo register.js mein hai)
const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}));

// Database Connection Function
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    try {
        await mongoose.connect(MONGO_URI);
        console.log("MongoDB Connected");
    } catch (err) {
        console.error("DB Connection Error:", err);
    }
};

module.exports = async (req, res) => {
    // Sirf POST request allow karein
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        await connectDB();
        const { phoneNumber, password } = req.body;

        // 1. Check karein user database mein hai ya nahi
        const user = await User.findOne({ phoneNumber });
        if (!user) {
            return res.status(400).json({ error: "User not found! Please register first." });
        }

        // 2. Password check karein (bcrypt se compare karein)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid password! Please try again." });
        }

        // 3. Agar sab sahi hai toh success bhejein
        return res.status(200).json({ 
            success: true, 
            message: "Login successful" 
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
