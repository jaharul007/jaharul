import mongoose from 'mongoose';

// 1. User Schema (Data kaise dikhega)
const userSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    inviteCode: { type: String },
    balance: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

// Model loading fix for Vercel (Hot Reloading)
const User = mongoose.models.User || mongoose.model('User', userSchema);

// 2. Database Connection Logic
const connectDB = async () => {
    if (mongoose.connections[0].readyState) return;
    try {
        // Vercel dashboard mein MONGODB_URI set karna mat bhulna
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB Connected");
    } catch (err) {
        console.error("Connection Error:", err);
    }
};

// 3. Main Handler Function
export default async function handler(req, res) {
    // Sirf POST request allow karein
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        await connectDB();
        const { phone, password, inviteCode } = req.body;

        // Check karein user pehle se toh nahi hai
        const userExists = await User.findOne({ phone });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'Phone number already registered!' });
        }

        // Naya User banayein
        const newUser = new User({
            phone,
            password,
            inviteCode,
            balance: 0 // Naye user ko 0 balance de rahe hain
        });

        await newUser.save();

        return res.status(200).json({ success: true, message: 'Registration Successful' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
}
