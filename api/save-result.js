const { MongoClient } = require('mongodb');

let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) return cachedClient;
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    cachedClient = client;
    return client;
}

export default async function handler(req, res) {
    // सिर्फ POST रिक्वेस्ट को अंदर आने देना
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { period, mode } = req.body;

    if (!period || !mode) {
        return res.status(400).json({ error: 'Missing period or mode' });
    }

    try {
        const client = await connectToDatabase();
        const db = client.db('wingo_game');
        
        // 0-9 के बीच एक रैंडम नंबर जनरेट करना
        const luckyNumber = Math.floor(Math.random() * 10);
        
        // डेटा स्ट्रक्चर जो आपके HTML टेबल के साथ मैच करेगा
        const newResult = {
            p: period,           // Period ID (e.g. 20240521101)
            n: luckyNumber,      // Number (0-9)
            mode: parseInt(mode),// Game mode (30, 60, 180, 300)
            createdAt: new Date()
        };

        // MongoDB में सेव करना
        await db.collection('game_history').insertOne(newResult);

        // सफलता का मैसेज भेजना
        res.status(200).json({ success: true, data: newResult });
    } catch (error) {
        console.error("Save Error:", error);
        res.status(500).json({ error: 'Failed to save result to Database' });
    }
}
