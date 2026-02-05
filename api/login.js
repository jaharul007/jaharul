const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGO_URI = process.env.MONGO_URI;

const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({
    phoneNumber: { type: String, required: true },
    password: { type: String, required: true }
}));

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    await mongoose.connect(MONGO_URI);
};

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

    try {
        await connectDB();
        const { phoneNumber, password } = req.body;

        const user = await User.findOne({ phoneNumber });
        if (!user) {
            return res.status(400).json({ error: "User not found!" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid password!" });
        }

        return res.status(200).json({ success: true, message: "Login successful", user: { phoneNumber: user.phoneNumber } });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
