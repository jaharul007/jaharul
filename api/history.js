import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
    // CORS Headers for Frontend Compatibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const client = await clientPromise;
        // जैसा आपने कहा, 'test' डेटाबेस और 'results' कलेक्शन का उपयोग
        const db = client.db("test"); 
        const resultsCollection = db.collection("results");

        // --- CASE 1: RESULT SAVE/GENERATE KARNA (POST) ---
        // यह तब कॉल होगा जब टाइमर 0 होगा या एडमिन रिजल्ट फोर्स करेगा
        if (req.method === 'POST') {
            const { period, mode, number, isAdmin } = req.body;

            if (!period || mode === undefined) {
                return res.status(400).json({ success: false, message: "Period or Mode missing" });
            }

            // 1. Check if result already exists for this mode and period
            const existing = await resultsCollection.findOne({ 
                period: period, 
                mode: parseInt(mode) 
            });

            let finalNum;

            if (isAdmin && number !== undefined) {
                // अगर एडमिन ने कंट्रोल पैनल से नंबर भेजा है (Force Win)
                finalNum = parseInt(number);
            } else if (!existing) {
                // अगर नया पीरियड है और रिजल्ट नहीं बना, तो रैंडम नंबर (0-9) जनरेट करो
                finalNum = Math.floor(Math.random() * 10);
            } else {
                // अगर रिजल्ट पहले से मौजूद है, तो वही वापस कर दो
                return res.json({ 
                    success: true, 
                    message: "Result already exists", 
                    number: existing.number 
                });
            }

            // 2. Color और Size Logic (Game Rules के हिसाब से)
            const color = (finalNum === 0) ? ['red', 'violet'] : 
                          (finalNum === 5) ? ['green', 'violet'] : 
                          (finalNum % 2 === 0) ? ['red'] : ['green'];
            
            const size = (finalNum >= 5) ? 'Big' : 'Small';

            // 3. Database में Save करना (Upsert ensures no duplicates)
            const resultDoc = {
                period: period,
                mode: parseInt(mode),
                number: finalNum,
                color: color,
                size: size,
                timestamp: new Date()
            };

            await resultsCollection.updateOne(
                { period: period, mode: parseInt(mode) },
                { $set: resultDoc },
                { upsert: true }
            );

            return res.status(200).json({ 
                success: true, 
                message: "Result Processed",
                data: resultDoc 
            });
        }

        // --- CASE 2: HISTORY LIST DIKHANA (GET) ---
        // विंगो गेम के नीचे जो हिस्ट्री टेबल होती है उसके लिए
        if (req.method === 'GET') {
            const { mode, page = 1, limit = 10 } = req.query;

            if (mode === undefined) {
                return res.status(400).json({ success: false, message: "Mode is required" });
            }

            const pageLimit = parseInt(limit);
            const skip = (parseInt(page) - 1) * pageLimit;

            // सिर्फ उस 'mode' की हिस्ट्री निकालो जो यूजर खेल रहा है (30s, 1m etc.)
            const historyData = await resultsCollection
                .find({ mode: parseInt(mode) })
                .sort({ period: -1 }) // नया पीरियड सबसे ऊपर (Descending)
                .skip(skip)
                .limit(pageLimit)
                .toArray();

            // Total count for pagination (Optional but good for UI)
            const total = await resultsCollection.countDocuments({ mode: parseInt(mode) });

            // Frontend compatibility format (HTML table में दिखाने के लिए)
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
        }

    } catch (e) {
        console.error("❌ History API Error:", e);
        return res.status(500).json({ success: false, error: e.message });
    }
}
