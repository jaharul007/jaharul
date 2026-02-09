import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI;

// Connection helper
async function dbConnect() {
    if (mongoose.connection.readyState >= 1) return;
    return mongoose.connect(MONGODB_URI);
}

// Withdrawal History Schema
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

// Generate unique order number
function generateOrderNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 10);
    
    return `WD${year}${month}${day}${hours}${minutes}${seconds}${random}`;
}

export default async function handler(req, res) {
    const { method } = req;

    try {
        await dbConnect();
    } catch (e) {
        return res.status(500).json({ error: "Database connection failed" });
    }

    try {
        if (method === 'POST') {
            // Withdrawal request create karna
            const { phone, amount, method: paymentMethod } = req.body;

            if (!phone || !amount || !paymentMethod) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Phone, Amount and Method are required" 
                });
            }

            // Minimum amount check
            if (amount < 110) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Minimum withdrawal amount is ₹110.00" 
                });
            }

            // Order number generate karna
            const orderNumber = generateOrderNumber();

            // Database mein save karna
            const withdrawal = new WithdrawalModel({
                phone,
                amount,
                type: paymentMethod,
                orderNumber,
                status: 'pending',
                time: new Date()
            });

            await withdrawal.save();

            return res.status(200).json({ 
                success: true, 
                message: "Withdrawal request submitted successfully",
                orderNumber,
                withdrawalId: withdrawal._id
            });

        } else if (method === 'GET') {
            // Withdrawal history fetch karna
            const { phone } = req.query;

            if (!phone) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Phone number is required" 
                });
            }

            const withdrawals = await WithdrawalModel
                .find({ phone })
                .sort({ time: -1 }); // Latest first

            return res.status(200).json({ 
                success: true, 
                withdrawals 
            });

        } else if (method === 'PUT') {
            // Status update karna (Admin feature)
            const { withdrawalId, status } = req.body;

            if (!withdrawalId || !status) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Withdrawal ID and Status are required" 
                });
            }

            const updatedWithdrawal = await WithdrawalModel.findByIdAndUpdate(
                withdrawalId,
                { status },
                { new: true }
            );

            if (!updatedWithdrawal) {
                return res.status(404).json({ 
                    success: false, 
                    message: "Withdrawal not found" 
                });
            }

            return res.status(200).json({ 
                success: true, 
                message: "Status updated successfully",
                withdrawal: updatedWithdrawal
            });

        } else {
            return res.status(405).json({ 
                success: false, 
                message: "Method not allowed" 
            });
        }
    } catch (err) {
        console.error("Error in withdraw API:", err);
        return res.status(500).json({ error: err.message });
    }
}
