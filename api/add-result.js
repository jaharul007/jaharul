import connectDB from '../db';
import mongoose from 'mongoose';

const ForcedSchema = new mongoose.Schema({ mode: Number, number: Number });
const Forced = mongoose.models.Forced || mongoose.model('Forced', ForcedSchema);

export default async function handler(req, res) {
    await connectDB();
    if (req.method === 'POST') {
        const { number, mode } = req.body;
        await Forced.findOneAndUpdate({ mode }, { number }, { upsert: true });
        return res.json({ success: true, message: "Result fixed for next round" });
    }
    res.status(405).json({ message: "Method not allowed" });
}
