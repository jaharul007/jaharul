const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// आपकी फोटो से लिया गया कनेक्शन स्ट्रिंग (पासवर्ड अपडेट कर दिया है)
const MONGO_URI = "mongodb+srv://Ccuffi:jfududid@cluster1.m3w4dg5.mongodb.net/gameDB?retryWrites=true&w=majority";

// MongoDB कनेक्शन
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Atlas से जुड़ गया है!"))
    .catch(err => console.error("❌ कनेक्शन फेल:", err));

// यूजर डाटा का स्ट्रक्चर
const userSchema = new mongoose.Schema({
    phone: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 },
    upiId: String,
    name: String,
    history: { type: Array, default: [] }
});

const User = mongoose.model('User', userSchema);

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

const ADMIN_INVITE_CODE = "BDG100";

// --- API Routes ---

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

app.post('/register', async (req, res) => {
    try {
        const { phone, password, inviteCode } = req.body;
        const existingUser = await User.findOne({ phone });
        if (existingUser) return res.json({ success: false, message: "यह नंबर पहले से है" });

        let bonus = (inviteCode === ADMIN_INVITE_CODE) ? 100.00 : 0.00;
        const newUser = new User({ phone, password, balance: bonus });
        await newUser.save();
        res.json({ success: true, userId: phone, balance: bonus });
    } catch (error) {
        res.status(500).json({ success: false, message: "रजिस्ट्रेशन फेल" });
    }
});

app.post('/save-upi', async (req, res) => {
    try {
        const { name, phone, upi } = req.body;
        await User.findOneAndUpdate({ phone }, { name, upiId: upi });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error saving UPI" });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ सर्वर चालू है पोर्ट ${PORT} पर`);
});
