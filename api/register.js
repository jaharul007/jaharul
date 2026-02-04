const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ===============================
// MongoDB Connection Logic (Optimized for Vercel)
// ===============================
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("CRITICAL ERROR: MONGO_URI is not defined in Vercel Environment Variables!");
}

// डेटाबेस से कनेक्ट करने का फंक्शन
async function connectToDatabase() {
    if (mongoose.connection.readyState >= 1) {
        return; // अगर पहले से कनेक्टेड है तो दोबारा कनेक्ट न करें
    }
    return mongoose.connect(MONGO_URI);
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

// मॉडल को दोबारा रजिस्टर करने से बचाने के लिए check
const User = mongoose.models.User || mongoose.model("User", UserSchema);

// ===============================
// Register API Handler
// ===============================
module.exports = async (req, res) => {
    // CORS Headers (अगर जरूरत हो तो)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONS रिक्वेस्ट को हैंडल करें (CORS preflight)
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    try {
        // 1. डेटाबेस कनेक्ट करें
        await connectToDatabase();

        const { phoneNumber, password, inviteCode } = req.body;

        // 2. इनपुट वैलिडेशन
        if (!phoneNumber || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "Phone number and password are required" 
            });
        }

        // 3. चेक करें कि यूजर पहले से है या नहीं
        const existingUser = await User.findOne({ phoneNumber });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: "This phone number is already registered" 
            });
        }

        // 4. पासवर्ड एन्क्रिप्ट करें
        const hashedPassword = await bcrypt.hash(password, 10);

        // 5. नया यूजर सेव करें
        const newUser = new User({
            phoneNumber,
            password: hashedPassword,
            inviteCode: inviteCode || null,
        });

        await newUser.save();

        // 6. सफलता का रिस्पॉन्स
        return res.status(200).json({ 
            success: true, 
            message: "Registration successful" 
        });

    } catch (error) {
        console.error("Backend Error Details:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Database error: " + error.message 
        });
    }
};
