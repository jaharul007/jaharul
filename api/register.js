const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGO_URI = process.env.MONGO_URI;

// Schema को User के साथ सिंक किया गया
const UserSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 }
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method Not Allowed" });

    try {
        // डेटाबेस कनेक्शन चेक
        if (mongoose.connection.readyState < 1) {
            await mongoose.connect(MONGO_URI);
        }

        // फ्रंटएंड (index.html) से 'phoneNumber' और 'inviteCode' आ रहा है
        const { phoneNumber, password, inviteCode, balance } = req.body;

        if (!phoneNumber || !password) {
            return res.status(400).json({ success: false, message: "Phone or Password missing" });
        }

        // चेक करें कहीं यूजर पहले से तो नहीं है
        const userExists = await User.findOne({ phone: phoneNumber });
        if (userExists) {
            return res.status(400).json({ success: false, message: "User already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        /**
         * लॉजिक: अगर फ्रंटएंड से बैलेंस (100) आ रहा है तो वो लें, 
         * नहीं तो इनवाइट कोड चेक करें।
         */
        let finalBalance = 0;
        if (balance && !isNaN(balance)) {
            finalBalance = Number(balance);
        } else if (inviteCode === "1234") {
            finalBalance = 100;
        }

        const newUser = new User({ 
            phone: phoneNumber, 
            password: hashedPassword, 
            balance: finalBalance 
        });

        await newUser.save();

        // सफलता का मैसेज (homepage को success: true चाहिए)
        return res.status(200).json({ 
            success: true, 
            message: "Registration successful",
            phone: phoneNumber 
        });

    } catch (error) {
        console.error("Register Error:", error);
        return res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};
