const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ===============================
// MongoDB Connection
// ===============================
const MONGO_URI = process.env.MONGO_URI || "YOUR_MONGODB_CONNECTION_STRING"; 

if (!mongoose.connection.readyState) {
    mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }).then(() => console.log("MongoDB Connected"))
      .catch(err => console.log("MongoDB Connection Error:", err));
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
// Register API Handler
// ===============================
module.exports = async (req, res) => {

    // सिर्फ POST रिक्वेस्ट की अनुमति दें
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    try {
        const { phoneNumber, password, inviteCode } = req.body;

        // इनपुट वैलिडेशन
        if (!phoneNumber || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "Phone & password required" 
            });
        }

        // चेक करें कि यूजर पहले से तो नहीं है
        const existingUser = await User.findOne({ phoneNumber });

        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: "User already exists" 
            });
        }

        // पासवर्ड एन्क्रिप्ट करें
        const hashedPassword = await bcrypt.hash(password, 10);

        // नया यूजर बनाएँ
        const newUser = new User({
            phoneNumber,
            password: hashedPassword,
            inviteCode: inviteCode || null,
        });

        await newUser.save();

        // सफलता का रिस्पॉन्स भेजें (Success Response)
        return res.status(200).json({ 
            success: true, 
            message: "Registration successful" 
        });

    } catch (error) {
        console.error("Backend Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Server error occurred" 
        });
    }
};
