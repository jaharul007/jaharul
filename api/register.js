const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Database URI from Vercel Environment Variables
const MONGO_URI = process.env.MONGO_URI;

// User Model (Schema)
const UserSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    inviteCode: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

// MongoDB Connection Function
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    if (!MONGO_URI) throw new Error("MONGO_URI is undefined. Check Vercel Settings.");
    await mongoose.connect(MONGO_URI);
};

module.exports = async (req, res) => {
    // CORS & Method Check
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

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ phoneNumber, password: hashedPassword, inviteCode });
        await newUser.save();

        // सफलता का मैसेज (JSON Format)
        return res.status(200).json({ success: true, message: "Registration successful" });

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
