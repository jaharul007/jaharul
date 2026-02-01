import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    try {
        const { number, mode, period } = req.body;

        if (number === undefined || !mode || !period) {
            return res.status(400).json({ success: false, message: "Missing number, mode, or period" });
        }

        const client = await clientPromise;
        const db = client.db("wingo_game");

        // Yahan hum 'history' collection use kar rahe hain 
        // kyunki aapka save-result.js isi naam ko dhoond raha hai
        await db.collection('history').updateOne(
            { mode: parseInt(mode), period: period }, 
            { $set: { number: parseInt(number), timestamp: new Date() } },
            { upsert: true } // Agar pehle se nahi hai toh naya bana dega
        );

        console.log(`🎯 Admin Fixed: Mode ${mode}, Period ${period}, Number ${number}`);

        return res.json({ 
            success: true, 
            message: `Result fixed to ${number} for period ${period}` 
        });

    } catch (e) {
        console.error("❌ Add Result Error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
}
