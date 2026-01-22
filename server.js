const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- आपका MongoDB लिंक ---
const MONGO_URI = "mongodb+srv://Ccuffi:jfududid@cluster1.m3w4dg5.mongodb.net/myGameDB?retryWrites=true&w=majority&appName=Cluster1";

// MongoDB से कनेक्शन (Vercel के लिए "await" हटाकर direct connect बेहतर है)
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Atlas से कनेक्ट हो गया!"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// डेटाबेस का ढांचा (Schema)
const userSchema = new mongoose.Schema({
    phone: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 },
    upiId: String,
    name: String,
    history: { type: Array, default: [] }
});

// Model को दोबारा डिफाइन होने से बचाने के लिए check (Vercel fix)
const User = mongoose.models.User || mongoose.model('User', userSchema);

// Middleware सेटअप
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

const ADMIN_INVITE_CODE = "BDG100";

// --- API Routes ---

// 1. लॉगिन (Login)
app.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await User.findOne({ phone, password });

        if (user) {
            res.json({ success: true, userId: user.phone, balance: user.balance });
        } else {
            res.status(401).json({ success: false, message: "गलत फोन या पासवर्ड" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "सर्वर एरर" });
    }
});

// 2. रजिस्टर (Register)
app.post('/register', async (req, res) => {
    try {
        const { phone, password, inviteCode } = req.body;
        
        const existingUser = await User.findOne({ phone });
        if (existingUser) return res.json({ success: false, message: "यह नंबर पहले से रजिस्टर है!" });

        let bonus = (inviteCode === ADMIN_INVITE_CODE) ? 100.00 : 0.00;
        
        const newUser = new User({ phone, password, balance: bonus });
        await newUser.save();

        res.json({ success: true, userId: phone, balance: bonus });
    } catch (error) {
        res.status(500).json({ success: false, message: "रजिस्ट्रेशन फेल" });
    }
});

// 3. UPI सेव करना
app.post('/save-upi', async (req, res) => {
    try {
        const { name, phone, upi } = req.body;
        await User.findOneAndUpdate({ phone }, { name, upiId: upi });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: "डाटा सेव नहीं हुआ" });
    }
});

// --- VERCEL के लिए सबसे ज़रूरी बदलाव ---
app.listen(PORT, () => {
    console.log(`🚀 सर्वर चालू है पोर्ट ${PORT} पर!`);
});

module.exports = app; // यह Vercel के लिए ज़रूरी है
