const { MongoClient } = require('mongodb');

// Connection ko bahar rakhein taaki Vercel ise reuse kare (Fast Performance)
const uri = process.env.MONGODB_URI;
let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) return cachedClient;
    const client = new MongoClient(uri);
    await client.connect();
    cachedClient = client;
    return client;
}

export default async function handler(req, res) {
    const { mode } = req.query;

    if (!mode) {
        return res.status(400).json({ error: 'Mode is required' });
    }

    try {
        const client = await connectToDatabase();
        const database = client.db('wingo_game'); 
        const historyCollection = database.collection('game_history');

        // Latest 10 results fetch karna
        const history = await historyCollection
            .find({ mode: parseInt(mode) }) 
            .sort({ p: -1 }) 
            .limit(10)       
            .toArray();

        // Header set karein taaki data refresh hota rahe
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.status(200).json(history);
    } catch (error) {
        console.error("DB Error:", error);
        res.status(500).json({ error: 'Database connection failed' });
    }
    // client.close() ko hata diya gaya hai taaki next request fast ho
}
