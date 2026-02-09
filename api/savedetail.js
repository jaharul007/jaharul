import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI;

// Connection helper function
async function dbConnect() {
    if (mongoose.connection.readyState >= 1) return;
    return mongoose.connect(MONGODB_URI);
}

// UPI Details Schema
const UpiDetailSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    upi: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { collection: 'upi_detail' });

// Bank Details Schema
const BankDetailSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    ifscCode: { type: String },
    email: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { collection: 'bank_card_detail' });

const UpiDetailModel = mongoose.models.UpiDetail || mongoose.model('UpiDetail', UpiDetailSchema);
const BankDetailModel = mongoose.models.BankDetail || mongoose.model('BankDetail', BankDetailSchema);

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
            const { phone, name, upi, bankName, accountNumber, ifscCode, email, type } = req.body;
            
            // Validation: Phone and type required
            if (!phone || !type) {
                return res.status(400).json({ success: false, message: "Phone and Type are required" });
            }

            if (type === 'upi') {
                // UPI details save karna
                if (!name || !upi) {
                    return res.status(400).json({ success: false, message: "Name and UPI ID are required" });
                }

                await UpiDetailModel.findOneAndUpdate(
                    { phone: phone },
                    { name, upi, updatedAt: new Date() },
                    { upsert: true, new: true }
                );
                
                return res.status(200).json({ success: true, message: "UPI details saved successfully" });

            } else if (type === 'bank') {
                // Bank details save karna
                if (!name || !bankName || !accountNumber) {
                    return res.status(400).json({ success: false, message: "Name, Bank Name and Account Number are required" });
                }

                await BankDetailModel.findOneAndUpdate(
                    { phone: phone },
                    { name, bankName, accountNumber, ifscCode, email, updatedAt: new Date() },
                    { upsert: true, new: true }
                );
                
                return res.status(200).json({ success: true, message: "Bank details saved successfully" });
            } else {
                return res.status(400).json({ success: false, message: "Invalid type. Use 'bank' or 'upi'" });
            }

        } else if (method === 'GET') {
            const { phone, type } = req.query;

            if (!phone || !type) {
                return res.status(400).json({ success: false, message: "Phone and Type are required" });
            }

            if (type === 'upi') {
                const data = await UpiDetailModel.findOne({ phone });
                
                if (data) {
                    return res.status(200).json({
                        exists: true,
                        bankName: "UPI ID",
                        accountNumber: data.upi,
                        userName: data.name
                    });
                } else {
                    return res.status(200).json({ exists: false });
                }

            } else if (type === 'bank') {
                const data = await BankDetailModel.findOne({ phone });
                
                if (data) {
                    return res.status(200).json({
                        exists: true,
                        bankName: data.bankName,
                        accountNumber: data.accountNumber,
                        userName: data.name
                    });
                } else {
                    return res.status(200).json({ exists: false });
                }
            } else {
                return res.status(400).json({ success: false, message: "Invalid type. Use 'bank' or 'upi'" });
            }
        } else {
            return res.status(405).json({ success: false, message: "Method not allowed" });
        }
    } catch (err) {
        console.error("Error in savedetail API:", err);
        return res.status(500).json({ error: err.message });
    }
}
