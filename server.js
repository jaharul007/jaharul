const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// --- 1. Database Connection ---
mongoose.connect('your_mongodb_url_here', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected Successfully!"))
  .catch(err => console.log("DB Connection Error: ", err));

// --- 2. User Schema ---
// Maine phone aur password jodd diya hai taaki registration fail na ho
const userSchema = new mongoose.Schema({
    userId: String,
    username: String,
    phone: { type: String, unique: true },
    password: { type: String },
    balance: { type: Number, default: 0 },
    inviteCode: String
});
const User = mongoose.model('User', userSchema);

// --- 3. API Route for Real Balance ---
app.get('/api/user/profile', async (req, res) => {
    const { id } = req.query; 

    try {
        const user = await User.findOne({ userId: id });
        if (user) {
            res.json({
                success: true,
                username: user.username,
                balance: user.balance
            });
        } else {
            res.status(404).json({ success: false, message: "User not found" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ==========================================
//    YAHAN SE ADMIN ROUTES JODEY GAYE HAIN
// ==========================================

// A. Admin Panel ke liye saare users ki list mangwana
app.get('/api/admin/users', async (req, res) => {
    try {
        const { phone } = req.query;
        let query = {};
        if (phone) query = { phone: phone };
        
        const users = await User.find(query);
        res.json(users);
    } catch (err) {
        res.status(500).json({ success: false, message: "Admin Fetch Error" });
    }
});

// B. Admin Panel se Balance update karne ka logic
app.post('/api/admin/update-balance', async (req, res) => {
    const { phone, balance } = req.body;
    try {
        const updatedUser = await User.findOneAndUpdate(
            { phone: phone }, 
            { balance: balance }, 
            { new: true }
        );
        if (updatedUser) {
            res.json({ success: true, message: "Balance Updated!" });
        } else {
            res.status(404).json({ success: false, message: "User not found" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Update Error" });
    }
});

// ==========================================

// Port setting
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
