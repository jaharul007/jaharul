import mongoose from 'mongoose';
import Result from '../models/Result.js';
import User from '../models/User.js'; 
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    await connectDB();

    // ========================================
    // POST: AUTO RESULT GENERATION / ADMIN FORCE
    // ========================================
    if (req.method === 'POST') {
        try {
            const { period, mode, number, isAdmin } = req.body;

            if (!period || mode === undefined) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Period or Mode missing" 
                });
            }

            // Check if result already exists
            const existing = await Result.findOne({ 
                period: period, 
                mode: parseInt(mode) 
            });

            if (existing) {
                return res.json({ 
                    success: true, 
                    message: "Result already exists", 
                    number: existing.number,
                    data: existing
                });
            }

            // Determine result number
            let finalNum;
            let isForced = false;

            if (isAdmin && number !== undefined) {
                // Admin forced result
                finalNum = parseInt(number);
                isForced = true;
            } else {
                // Auto-generate random result (0-9)
                finalNum = Math.floor(Math.random() * 10);
            }

            // Calculate color and size
            const color = (finalNum === 0) ? ['red', 'violet'] : 
                          (finalNum === 5) ? ['green', 'violet'] : 
                          (finalNum % 2 === 0) ? ['red'] : ['green'];
            
            const size = (finalNum >= 5) ? 'Big' : 'Small';

            // Save result to database
            const resultDoc = {
                period: period,
                mode: parseInt(mode),
                number: finalNum,
                color: color,
                size: size,
                isForced: isForced,
                timestamp: new Date()
            };

            const savedResult = await Result.create(resultDoc);

            console.log(`✅ Result Generated: Period ${period}, Mode ${mode}, Number ${finalNum}`);

            return res.status(200).json({ 
                success: true, 
                message: isForced ? "Result Forced by Admin" : "Result Auto-Generated",
                data: savedResult
            });

        } catch (e) {
            console.error("❌ History POST Error:", e);
            return res.status(500).json({ 
                success: false, 
                error: e.message 
            });
        }
    }

    // ========================================
    // GET: FETCH HISTORY FOR ALL MODES
    // ========================================
    if (req.method === 'GET') {
        try {
            const { mode, page = 1, limit = 10 } = req.query;

            if (mode === undefined) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Mode is required" 
                });
            }

            const pageLimit = parseInt(limit);
            const skip = (parseInt(page) - 1) * pageLimit;

            // Fetch results for specific mode
            const historyData = await Result
                .find({ mode: parseInt(mode) })
                .sort({ period: -1 }) // Latest first
                .skip(skip)
                .limit(pageLimit)
                .lean();

            // Total count for pagination
            const total = await Result.countDocuments({ mode: parseInt(mode) });

            // Format for frontend compatibility
            const formattedData = historyData.map(item => ({
                p: item.period,      // Period
                n: item.number,      // Number
                c: item.color,       // Color Array
                s: item.size,        // Big/Small
                t: item.timestamp    // Time
            }));

            return res.status(200).json({
                success: true,
                mode: parseInt(mode),
                results: formattedData,
                total: total,
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / pageLimit)
            });

        } catch (e) {
            console.error("❌ History GET Error:", e);
            return res.status(500).json({ 
                success: false, 
                error: e.message 
            });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}
