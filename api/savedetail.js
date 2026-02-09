import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI;

// Connection helper function
async function dbConnect() {
    if (mongoose.connection.readyState >= 1) return;
    return mongoose.connect(MONGODB_URI);
}

const DetailSchema = new mongoose.Schema({
    phone: { type: String, required: true },
    name: String,
    upi: String,
    bankName: String,
    accountNumber: String,
    type: { type: String, enum: ['bank', 'upi'] } // Sirf ye do options allow honge
}, { collection: 'saved_details' }); // Collection name space bina rakhein toh behtar hai

const DetailModel = mongoose.models.Detail || mongoose.model('Detail', DetailSchema);

export default async function handler(req, res) {
    const { method } = req;
    
    // Database connect karein
    try {
        await dbConnect();
    } catch (e) {
        return res.status(500).json({ error: "Database connection failed" });
    }

    try {
        if (method === 'POST') {
            const { phone, name, upi, bankName, accountNumber, type } = req.body;
            
            // Validation: Agar phone ya type missing hai
            if (!phone || !type) {
                return res.status(400).json({ success: false, message: "Phone and Type are required" });
            }

            await DetailModel.findOneAndUpdate(
                { phone: phone, type: type },
                { name, upi, bankName, accountNumber, type },
                { upsert: true, new: true }
            );
            return res.status(200).json({ success: true, message: "Saved Successfully" });

        } else if (method === 'GET') {
            const { phone, type } = req.query;
            const data = await DetailModel.findOne({ phone, type });

            if (data) {
                // Formatting for UI
                return res.status(200).json({
                    exists: true,
                    bankName: type === 'bank' ? data.bankName : "UPI ID",
                    accountNumber: type === 'bank' ? data.accountNumber : data.upi,
                    userName: data.name
                });
            } else {
                return res.status(200).json({ exists: false });
            }
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
