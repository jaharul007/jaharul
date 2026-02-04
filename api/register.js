const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ===============================
// MongoDB Connection
// ===============================
const MONGO_URI = "YOUR_MONGODB_CONNECTION_STRING"; 
// 👉 यहाँ अपना MongoDB Atlas connection link डालना

if (!mongoose.connection.readyState) {
    mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
}

// ===============================
// User Schema
// ===============================
const UserSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    inviteCode: {
        type: String,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

// ===============================
// Register API
// ===============================
module.exports = async (req, res) => {

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {

        const { phoneNumber, password, inviteCode } = req.body;

        if (!phoneNumber || !password) {
            return res.status(400).json({ error: "Phone & password required" });
        }

        // Check existing user
        const existingUser = await User.findOne({ phoneNumber });

        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Encrypt password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user
        const newUser = new User({
            phoneNumber,
            password: hashedPassword,
            inviteCode: inviteCode || null,
        });

        await newUser.save();

        res.status(200).json({ message: "Registration successful" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};