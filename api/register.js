const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGO_URI = process.env.MONGO_URI;

// Schema को सरल रखें
const UserSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true }, // हमने 'phone' रखा है
    password: { type: String, required: true },
    balance: { type: Number, default: 0 }
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    try {
        if (mongoose.connection.readyState < 1) await mongoose.connect(MONGO_URI);

        // यहाँ ध्यान दें: फ्रंटएंड से 'phoneNumber' आ रहा है या 'phone'? 
        // हम दोनों चेक कर लेते हैं ताकि गलती न हो
        const { phoneNumber, phone, password, inviteCode } = req.body;
        const finalPhone = phoneNumber || phone; 

        if (!finalPhone || !password) {
            return res.status(400).json({ success: false, message: "Details missing" });
        }

        const userExists = await User.findOne({ phone: finalPhone });
        if (userExists) {
            return res.status(400).json({ success: false, message: "Already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const bonus = (inviteCode === "1234") ? 100 : 0;

        const newUser = new User({ 
            phone: finalPhone, 
            password: hashedPassword, 
            balance: bonus 
        });

        await newUser.save();
        return res.status(200).json({ success: true, phone: finalPhone });

    } catch (error) {
        console.error("Register Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
