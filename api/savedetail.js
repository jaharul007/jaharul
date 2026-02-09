const mongoose = require('mongoose');

// MongoDB Connection (Vercel के लिए ये बेस्ट तरीका है)
if (!global.mongoose) {
    global.mongoose = mongoose.connect(process.env.MONGO_URI || "mongodb+srv://your_id:password@cluster.mongodb.net/test");
}

// Schema Setup (Collection: upi bank detail)
const DetailSchema = new mongoose.Schema({
    phone: String,
    name: String,
    upi: String,        // UPI के लिए
    bankName: String,   // Bank के लिए
    accountNumber: String, // Bank के लिए
    type: String        // 'bank' या 'upi'
}, { collection: 'upi bank detail' });

const DetailModel = mongoose.models.DetailModel || mongoose.model('DetailModel', DetailSchema);

export default async function handler(req, res) {
    const { method } = req;

    try {
        if (method === 'POST') {
            // डेटा सेव करने के लिए (Add Bank/UPI पेज से आएगा)
            const { phone, name, upi, bankName, accountNumber, type } = req.body;
            
            await DetailModel.findOneAndUpdate(
                { phone: phone, type: type }, // एक ही फोन पर अलग-अलग type (bank/upi) सेव होंगे
                { name, upi, bankName, accountNumber, type },
                { upsert: true, new: true }
            );
            return res.status(200).json({ success: true, message: "Saved Successfully" });

        } else if (method === 'GET') {
            // डेटा दिखाने के लिए (Withdraw पेज से आएगा)
            const { phone, type } = req.query;
            const data = await DetailModel.findOne({ phone: phone, type: type });

            if (data) {
                return res.status(200).json({
                    exists: true,
                    bankName: type === 'bank' ? data.bankName : "UPI ID",
                    accountNumber: type === 'bank' ? data.accountNumber : data.upi
                });
            } else {
                return res.status(200).json({ exists: false });
            }
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
