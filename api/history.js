import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const client = await clientPromise;
        // जैसा आपने कहा: हिस्ट्री के लिए अलग डेटाबेस
        const db = client.db("history_db"); 
        const collection = db.collection("history");

        // --- CASE 1: RESULT SAVE KARNA (POST) ---
        // Yeh Admin Panel aur Timer dono use karenge
        if (req.method === 'POST') {
            const { period, mode, number, isAdmin } = req.body;

            if (!period || mode === undefined) {
                return res.status(400).json({ success: false, message: "Missing Data" });
            }

            // Check karo kya is period ka result pehle se hai?
            const existing = await collection.findOne({ period: period, mode: parseInt(mode) });

            let finalNum;
            if (isAdmin && number !== undefined) {
                // Agar admin ne force kiya hai
                finalNum = parseInt(number);
            } else if (!existing) {
                // Agar naya period hai aur result nahi bana, toh random banao
                finalNum = Math.floor(Math.random() * 10);
            } else {
                return res.json({ success: true, message: "Result already exists" });
            }

            // Update ya Insert (Upsert)
            await collection.updateOne(
                { period: period, mode: parseInt(mode) },
                { 
                    $set: { 
                        number: finalNum, 
                        timestamp: new Date(),
                        color: (finalNum === 0) ? ['red', 'violet'] : (finalNum === 5) ? ['green', 'violet'] : (finalNum % 2 === 0) ? ['red'] : ['green'],
                        size: (finalNum >= 5) ? 'Big' : 'Small'
                    } 
                },
                { upsert: true }
            );

            return res.status(200).json({ success: true, number: finalNum });
        }

        // --- CASE 2: HISTORY DIKHANA (GET) ---
        if (req.method === 'GET') {
            const { mode, page = 1 } = req.query;
            const limit = 10;
            const skip = (parseInt(page) - 1) * limit;

            const historyData = await collection
                .find({ mode: parseInt(mode) })
                .sort({ period: -1 }) // Naya result sabse upar
                .skip(skip)
                .limit(limit)
                .toArray();

            // Frontend compatibility format
            const formattedData = historyData.map(item => ({
                period: item.period,
                number: item.number,
                result: item.number,
                n: item.number,
                p: item.period,
                color: item.color,
                size: item.size
            }));

            return res.status(200).json({
                success: true,
                results: formattedData,
                page: parseInt(page)
            });
        }

    } catch (e) {
        console.error("❌ History API Error:", e);
        return res.status(500).json({ success: false, error: e.message });
    }
}
