const { MongoClient } = require('mongodb');

// Connection caching taaki MongoDB crash na ho
let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) return cachedClient;
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    cachedClient = client;
    return client;
}

export default async function handler(req, res) {
    // Mode query se lena (e.g., /api/history?mode=60)
    const { mode } = req.query;

    if (!mode) {
        return res.status(400).json({ error: 'Mode is required' });
    }

    try {
        const client = await connectToDatabase();
        const db = client.db('wingo_game'); 
        const historyCollection = db.collection('game_history');

        // Latest 10 results fetch karna (Period ID 'p' ke hisaab se descending)
        const history = await historyCollection
            .find({ mode: parseInt(mode) }) 
            .sort({ p: -1 }) 
            .limit(10)       
            .toArray();

        // Browser cache rokne ke liye headers
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.status(200).json(history);
    } catch (error) {
        console.error("DB Error:", error);
        res.status(500).json({ error: 'Database connection failed' });
    }
    // client.close() yahan nahi karna hai
}
