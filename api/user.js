import mongoose from 'mongoose';
import User from '../models/User';

const connectDB = async () => {
    if (mongoose.connections[0].readyState) return;
    await mongoose.connect(process.env.MONGO_URI); // Aapka environment variable
};

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        await connectDB();
        const { phone } = req.query;

        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }

        const user = await User.findOne({ phoneNumber: phone });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Homepage ko data bhej rahe hain
        return res.status(200).json({ 
            success: true, 
            data: {
                balance: user.balance,
                phoneNumber: user.phoneNumber
            }
        });

    } catch (error) {
        console.error("API User Error:", error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
