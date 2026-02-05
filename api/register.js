import mongoose from 'mongoose';
import User from '../models/User';

const connectDB = async () => {
    if (mongoose.connections[0].readyState) return;
    await mongoose.connect(process.env.MONGO_URI);
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false });

    try {
        await connectDB();
        const { phoneNumber, password, inviteCode, balance } = req.body;

        const userExists = await User.findOne({ phoneNumber });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'Already registered' });
        }

        const newUser = new User({
            phoneNumber,
            password,
            inviteCode,
            balance: balance || 0 // Frontend se bheja hua balance le raha hai
        });

        await newUser.save();
        return res.status(201).json({ success: true, message: 'Success' });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
