// api/balance.js
import connectDB from '../lib/mongodb';
import User from '../models/User';

export default async function handler(req, res) {
    await connectDB();

    const { userId, amount, action } = req.body; // action: 'add' या 'deduct'

    if (req.method === 'POST') {
        try {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            if (action === 'add') {
                user.balance += parseFloat(amount);
            } else if (action === 'deduct') {
                if (user.balance < amount) {
                    return res.status(400).json({ success: false, message: "Insufficient balance" });
                }
                user.balance -= parseFloat(amount);
            }

            await user.save();
            return res.status(200).json({ success: true, newBalance: user.balance });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    } else {
        res.status(405).json({ message: "Only POST requests allowed" });
    }
}
