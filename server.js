const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// --- 1. Database Connection ---
// 'your_mongodb_url' ki jagah apni asli MongoDB string dalein
mongoose.connect('your_mongodb_url_here', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected Successfully!"))
  .catch(err => console.log("DB Connection Error: ", err));

// --- 2. User Schema (Aapke DB ke hisaab se) ---
const userSchema = new mongoose.Schema({
    userId: String,
    username: String,
    balance: { type: Number, default: 0 }
});
const User = mongoose.model('User', userSchema);

// --- 3. API Route for Real Balance ---
// Ye wahi API hai jo maine index.html mein fetch() mein dali thi
app.get('/api/user/profile', async (req, res) => {
    const { id } = req.query; // id index.html se aayegi

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

// Port setting
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
