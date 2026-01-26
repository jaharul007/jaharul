const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// --- 1. Database Connection ---
const DB_URL = 'mongodb+srv://alluserdatabase:alluserdatabase@cluster0.bcpe0i1.mongodb.net/BDG_GAME?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected Successfully!"))
  .catch(err => console.log("DB Connection Error: ", err));

// --- 2. User Schema ---
const userSchema = new mongoose.Schema({
    userId: String,
    username: String,
    phone: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 },
    inviteCode: String
});
const User = mongoose.model('User', userSchema);

// --- 3. User Registration Route ---
app.post('/api/user', async (req, res) => {
    const { phone, password, inviteCode, balance } = req.body;
    
    // Validation: Agar phone ya password nahi hai toh request reject karega (400 Bad Request Fix)
    if (!phone || !password) {
        return res.status(400).json({ success: false, message: "Phone and Password are required!" });
    }

    try {
        const newUser = new User({
            phone: phone,
            userId: phone, 
            username: "Member_" + phone.substring(phone.length - 4), // Last 4 digits for unique look
            password: password,
            inviteCode: inviteCode,
            balance: balance || 0
        });
        await newUser.save();
        res.json({ success: true, message: "Registered Successfully!" });
    } catch (err) {
        if(err.code === 11000) {
            res.status(400).json({ success: false, message: "Phone number already exists!" });
        } else {
            res.status(500).json({ success: false, message: "Error saving user" });
        }
    }
});

// --- 4. API Route for Real Balance & Profile ---
app.get('/api/user/profile', async (req, res) => {
    const { id } = req.query; 
    if (!id) return res.status(400).json({ success: false, message: "User ID missing" });

    try {
        const user = await User.findOne({ userId: id });
        if (user) {
            res.json({
                success: true,
                username: user.username,
                balance: user.balance,
                phone: user.phone
            });
        } else {
            res.status(404).json({ success: false, message: "User not found" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ==========================================
//    ADMIN PANEL ROUTES (Control Center)
// ==========================================

// A. Users ki list fetch karne ke liye
app.get('/api/admin/users', async (req, res) => {
    try {
        const { phone } = req.query;
        let query = {};
        if (phone) query = { phone: phone };
        
        // Admin ko saara data dikhega
        const users = await User.find(query).sort({ _id: -1 }); 
        res.json(users);
    } catch (err) {
        res.status(500).json({ success: false, message: "Admin Fetch Error" });
    }
});

// B. Balance Update karne ke liye
app.post('/api/admin/update-balance', async (req, res) => {
    const { phone, balance } = req.body;
    
    if (!phone || balance === undefined) {
        return res.status(400).json({ success: false, message: "Invalid Data" });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { phone: phone }, 
            { balance: balance }, 
            { new: true }
        );
        if (updatedUser) {
            res.json({ success: true, message: "Balance Updated Successfully!" });
        } else {
            res.status(404).json({ success: false, message: "User not found" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Update Error" });
    }
});

// ==========================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
