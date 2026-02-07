Import mongoose from 'mongoose';
import Bet from '../models/Bet.js';

const connectDB = async () => {
    if (mongoose.connections && mongoose.connections[0].readyState) {
        return;
    }
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected Successfully");
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
    }
};

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    await connectDB();

    if (req.method === 'GET') {
        const { phone, mode, limit = 50 } = req.query;

        if (!phone) {
            return res.status(400).json({ 
                success: false, 
                message: 'Phone number required' 
            });
        }

        try {
            const query = { phone };
            
            // If mode specified, filter by mode
            if (mode) {
                query.mode = parseInt(mode);
            }

            const userBets = await Bet
                .find(query)
                .sort({ timestamp: -1 })
                .limit(parseInt(limit))
                .lean();

            return res.json({
                success: true,
                bets: userBets,
                count: userBets.length
            });

        } catch (e) {
            console.error("My History Error:", e);
            return res.status(500).json({ 
                success: false, 
                error: e.message 
            });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}