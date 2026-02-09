import mongoose from 'mongoose';
import User from '../models/User.js'; // आपका दिया हुआ मॉडल

const MONGODB_URI = process.env.MONGO_URI;

async function dbConnect() {
    if (mongoose.connection.readyState >= 1) return;
    return mongoose.connect(MONGODB_URI);
}

const WithdrawalSchema = new mongoose.Schema({
    phone: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['bank', 'upi', 'usdt'], required: true },
    orderNumber: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    time: { type: Date, default: Date.now },
    remarks: { type: String, default: '' }
}, { collection: 'withdrawal_history' });

const WithdrawalModel = mongoose.models.Withdrawal || mongoose.model('Withdrawal', WithdrawalSchema);

function generateOrderNumber() {
    const now = new Date();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `WD${now.getTime()}${random}`;
}

export default async function handler(req, res) {
    const { method } = req;
    await dbConnect();

    try {
        if (method === 'POST') {
            const { phone, amount, method: paymentMethod } = req.body;
            const withdrawAmount = parseFloat(amount);

            if (!phone || !amount || !paymentMethod) {
                return res.status(400).json({ success: false, message: "Details missing" });
            }

            if (withdrawAmount < 110) {
                return res.status(400).json({ success: false, message: "Minimum ₹110 required" });
            }

            // --- बैलेंस काटने का असली लॉजिक यहाँ है ---
            
            // 1. आपके मॉडल के हिसाब से 'phoneNumber' फील्ड में सर्च कर रहे हैं
            const user = await User.findOne({ phoneNumber: phone });

            if (!user) {
                return res.status(404).json({ success: false, message: "User not found in database" });
            }

            // 2. बैलेंस चेक
            if (user.balance < withdrawAmount) {
                return res.status(400).json({ success: false, message: "Insufficient balance!" });
            }

            // 3. बैलेंस अपडेट (Deduction)
            // हम direct update use कर रहे हैं ताकि कोई गलती न हो
            const updatedUser = await User.findOneAndUpdate(
                { phoneNumber: phone },
                { $inc: { balance: -withdrawAmount } }, // बैलेंस घटाया
                { new: true }
            );

            // 4. विड्रॉल हिस्ट्री सेव करें
            const orderNumber = generateOrderNumber();
            const withdrawal = new WithdrawalModel({
                phone: phone,
                amount: withdrawAmount,
                type: paymentMethod,
                orderNumber: orderNumber,
                status: 'pending'
            });

            await withdrawal.save();

            return res.status(200).json({ 
                success: true, 
                message: "Balance deducted and request saved",
                newBalance: updatedUser.balance,
                orderNumber: orderNumber
            });

        } else if (method === 'GET') {
            const { phone } = req.query;
            const withdrawals = await WithdrawalModel.find({ phone }).sort({ time: -1 });
            return res.status(200).json({ success: true, withdrawals });

        } else if (method === 'PUT') {
            // एडमिन स्टेटस अपडेट के लिए
            const { withdrawalId, status } = req.body;
            const updated = await WithdrawalModel.findByIdAndUpdate(withdrawalId, { status }, { new: true });
            return res.status(200).json({ success: true, updated });

        } else {
            return res.status(405).json({ success: false, message: "Method not allowed" });
        }
    } catch (err) {
        console.error("API Error:", err);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}
