import mongoose from 'mongoose';
import Result from '../models/Result.js';

const connectDB = async () => {
    if (mongoose.connections && mongoose.connections[0].readyState) {
        return;
    }
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB Connected");
    } catch (error) {
        console.error("❌ MongoDB Error:", error);
    }
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    await connectDB();

    // ========================================
    // POST: GENERATE OR FORCE RESULT
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

            // ✅ FIXED: If admin is forcing, DELETE old result first
            if (existing && isAdmin && number !== undefined) {
                console.log(`🔧 Admin forcing new result, deleting old: ${existing.number}`);
                await Result.deleteOne({ 
                    period: period, 
                    mode: parseInt(mode) 
                });
            } else if (existing) {
                // Normal case - result exists and not forcing
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

            // ✅ FIXED: Admin force logic
            if (isAdmin === true && number !== undefined && number !== null && number !== '') {
                finalNum = parseInt(number);
                isForced = true;
                console.log(`🔧 ADMIN FORCING RESULT: ${finalNum}`);
            } else {
                finalNum = Math.floor(Math.random() * 10);
                console.log(`🎰 AUTO RESULT: ${finalNum}`);
            }

            // Validate number
            if (finalNum < 0 || finalNum > 9 || isNaN(finalNum)) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Invalid number (must be 0-9)" 
                });
            }

            // Calculate color and size
            let color;
            if (finalNum === 0) {
                color = ['red', 'violet'];
            } else if (finalNum === 5) {
                color = ['green', 'violet'];
            } else if (finalNum % 2 === 0) {
                color = ['red'];
            } else {
                color = ['green'];
            }
            
            const size = (finalNum >= 5) ? 'Big' : 'Small';

            // Save result
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

            console.log(`✅ Result saved: Period ${period}, Number ${finalNum}, Forced: ${isForced}`);

            return res.status(200).json({ 
                success: true, 
                message: isForced ? "Admin result saved" : "Auto result generated",
                number: finalNum,
                data: savedResult
            });

        } catch (e) {
            console.error("❌ POST Error:", e);
            return res.status(500).json({ 
                success: false, 
                error: e.message 
            });
        }
    }

    // ========================================
    // GET: FETCH HISTORY
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

            const historyData = await Result
                .find({ mode: parseInt(mode) })
                .sort({ period: -1 })
                .skip(skip)
                .limit(pageLimit)
                .lean();

            const total = await Result.countDocuments({ mode: parseInt(mode) });

            const formattedData = historyData.map(item => ({
                p: item.period,
                n: item.number,
                c: item.color,
                s: item.size,
                t: item.timestamp
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
            console.error("❌ GET Error:", e);
            return res.status(500).json({ 
                success: false, 
                error: e.message 
            });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}
